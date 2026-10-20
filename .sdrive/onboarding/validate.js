// Runs the SpecDrive governance validator with an Ajv v8-compatible resolution.
//
// Why this wrapper exists: the app's root node_modules contains Ajv 6.x (pulled in
// by another dependency), while .sdrive/scripts/validate-governance.js and the
// installed ajv-formats 3.x expect Ajv 8.x. Requiring the validator directly from
// this project therefore crashes inside addFormats() before any file is checked.
//
// This wrapper locates any Ajv 8.x copy that is already installed and redirects
// only the bare "ajv" specifier to it, then runs the same validateArtifacts()
// function the CLI uses. No project or framework file is modified.

const fs = require("fs");
const path = require("path");
const Module = require("module");

const ok = "\u2705";
const fail = "\u274c";

const projectRoot = path.join(__dirname, "..", "..");

// Search the project, then the global npm prefix, for an Ajv 8.x release.
function findAjvV8(startDirs) {
  const candidates = [];
  const seen = new Set();
  const queue = [...startDirs];

  while (queue.length > 0 && candidates.length < 200) {
    const dir = queue.shift();
    if (seen.has(dir)) continue;
    seen.add(dir);

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      if (entry.name === ".git" || entry.name === ".next") continue;

      const full = path.join(dir, entry.name);

      if (entry.name === "ajv") {
        try {
          const pkg = JSON.parse(
            fs.readFileSync(path.join(full, "package.json"), "utf8")
          );
          if (String(pkg.version || "").startsWith("8.")) {
            candidates.push({ dir: full, version: pkg.version });
            return candidates.sort((a, b) =>
              b.version.localeCompare(a.version, undefined, { numeric: true })
            )[0];
          }
        } catch {
          /* ignore unreadable candidates */
        }
        continue;
      }

      // Only descend into directories that can contain dependencies.
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        dir.endsWith("node_modules")
      ) {
        queue.push(full);
      }
    }
  }

  return null;
}

const searchRoots = [
  path.join(projectRoot, "node_modules"),
  path.join(process.env.APPDATA || "", "npm", "node_modules"),
].filter((dir) => dir && fs.existsSync(dir));

const ajvV8 = findAjvV8(searchRoots);

if (!ajvV8) {
  console.log(
    `${fail} Could not find an installed Ajv 8.x copy; run "npm install --no-save ajv@^8" and retry.`
  );
  process.exit(1);
}

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "ajv" || request.startsWith("ajv/")) {
    return originalResolve.call(this, request, parent, isMain, {
      ...(options || {}),
      paths: [path.dirname(ajvV8.dir)],
    });
  }

  return originalResolve.call(this, request, parent, isMain, options);
};

const { validateArtifacts } = require("../scripts/validate-governance");

console.log(
  `\uD83D\uDD0D SpecDrive Governance Validation (Ajv ${ajvV8.version} compatibility wrapper)\n`
);

const { ok: valid, results } = validateArtifacts(projectRoot, {
  log: (line) => console.log(line),
});

const invalid = results.filter((result) => result.status === "invalid");

console.log("\n----------------------------------------");

if (!valid) {
  console.log(`${fail} Validation FAILED. ${invalid.length} file(s) invalid.`);
  for (const result of invalid) {
    console.log(`- ${result.file}`);
    for (const error of result.errors || []) {
      console.log(`    ${error.instancePath || "/"} ${error.message}`);
    }
  }
  process.exit(1);
}

console.log(`${ok} Governance validation complete. All present files are valid.`);
