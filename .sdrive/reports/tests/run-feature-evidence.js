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
  // Vitest writes its JSON report before exiting non-zero. Keep going so the
  // summary and AC IDs are still printed for a failing run; the exit code below
  // remains Vitest's own success flag.
  console.error(`Vitest exited with code ${run.status ?? 1}.`);
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

// The evidence parser also harvests AC-### IDs from the captured output. Printing
// them lets review.json prove WHICH criteria the run exercised, not merely how
// many assertions passed. Derived from the reporter's own titles; nothing is
// inferred or invented.
const acIds = new Set();

for (const suite of report.testResults || []) {
  for (const test of suite.assertionResults || []) {
    for (const match of String(test.fullName || "").matchAll(/\bAC-\d{3}\b/g)) {
      acIds.add(match[0]);
    }
  }
}

console.log(`ACs exercised: ${[...acIds].sort().join(" ")}`);

process.exit(report.success ? 0 : 1);
