// Runs the SpecDrive governance validator with an Ajv v8-compatible resolution.
//
// Why this wrapper exists: the app's root node_modules contains Ajv 6.x (pulled in
// by another dependency), while .sdrive/scripts/validate-governance.js and the
// installed ajv-formats 3.x expect Ajv 8.x. Requiring the validator directly from
// this project therefore crashes inside addFormats() before any file is checked.
//
// This wrapper redirects only the bare "ajv" specifier to the Ajv 8 copy that
// ships inside node_modules/ajv-formats, then runs the same validateArtifacts()
// function the CLI uses. No project or framework file is modified.

const path = require("path");
const Module = require("module");

const ok = "\u2705";
const fail = "\u274c";

const projectRoot = path.join(__dirname, "..", "..");
const ajvV8Root = path.join(projectRoot, "node_modules", "ajv-formats", "node_modules");

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "ajv" || request.startsWith("ajv/")) {
    return originalResolve.call(this, request, parent, isMain, {
      ...(options || {}),
      paths: [ajvV8Root],
    });
  }

  return originalResolve.call(this, request, parent, isMain, options);
};

const { validateArtifacts } = require("../scripts/validate-governance");

console.log("\uD83D\uDD0D SpecDrive Governance Validation (Ajv 8 compatibility wrapper)\n");

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
