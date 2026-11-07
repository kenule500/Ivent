// Compatibility entry point for SpecDrive governance validation.
//
// History: the root node_modules used to resolve Ajv 6 (a transitive dependency of
// ESLint), while .sdrive/scripts/validate-governance.js and ajv-formats 3.x require
// Ajv 8. This wrapper originally redirected the bare "ajv" specifier to a nested
// Ajv 8 copy. That copy does not ship with ajv-formats, so the workaround depended
// on the machine's user-level node_modules and eventually crashed.
//
// The project now declares ajv@8 and ajv-formats@3 as devDependencies, so the
// framework validator works directly:
//
//   node .sdrive/scripts/validate-governance.js
//
// This file is kept as a thin alias for existing references (docs, scripts, and
// .sdrive/reports). It performs no module patching.

const path = require("path");

const { validateArtifacts } = require("../scripts/validate-governance");

const projectRoot = path.join(__dirname, "..", "..");

console.log("\uD83D\uDD0D SpecDrive Governance Validation\n");

const { ok: valid, results } = validateArtifacts(projectRoot, {
  log: (line) => console.log(line),
});

const invalid = results.filter((result) => result.status === "invalid");

console.log("\n----------------------------------------");

if (!valid) {
  console.log(`\u274c Validation FAILED. ${invalid.length} file(s) invalid.`);
  for (const result of invalid) {
    console.log(`- ${result.file}`);
    for (const error of result.errors || []) {
      console.log(`    ${error.instancePath || "/"} ${error.message}`);
    }
  }
  process.exit(1);
}

console.log("\u2705 Governance validation complete. All present files are valid.");
