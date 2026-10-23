// Runs a feature's Vitest suite through the JSON reporter, then prints the
// Jest-style summary line that `sdrive test` can parse.
//
// The SpecDrive evidence parser looks for "Tests: N failed, N passed, N total".
// Vitest's human reporters print "Tests  N passed (N)" with no colon, so evidence
// recorded straight from `npx vitest` has zero recognisable results. This wrapper
// exists only to bridge that format gap; it does not add, skip, or reinterpret
// tests. The exit code is Vitest's own success flag.
//
// Usage: node .sdrive/reports/tests/run-feature-evidence.js <feature>

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const feature = process.argv[2] || "admin-dashboard-update";
const projectRoot = path.join(__dirname, "..", "..", "..");
const testDir = path.join("test", feature);
const outputFile = path.join(__dirname, "raw", `${feature}-vitest.json`);

fs.mkdirSync(path.dirname(outputFile), { recursive: true });

const command = `npx vitest run "${testDir}" --reporter=json --outputFile="${outputFile}"`;
const run = spawnSync(command, {
  cwd: projectRoot,
  shell: true,
  stdio: "inherit",
});

if (run.status !== 0) {
  process.exit(typeof run.status === "number" ? run.status : 1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(outputFile, "utf8"));
} catch (error) {
  console.error(`Could not read Vitest JSON report at ${outputFile}: ${error.message}`);
  process.exit(1);
}

console.log(
  `Tests: ${report.numFailedTests} failed, ${report.numPassedTests} passed, ${report.numTotalTests} total`
);

process.exit(report.success ? 0 : 1);
