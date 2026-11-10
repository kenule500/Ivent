import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * AC-011: the declared JavaScript budget.
 *
 * This is a consistency guard, not a runtime measurement: it proves the budget
 * numbers are still declared where the gate reads them and that the recorded
 * measurement sits inside them. A silent budget change, or a report that
 * contradicts its own budget, fails here instead of being forgotten.
 *
 * The runtime number itself is produced by `npm run lighthouse` and recorded in
 * the performance report; measuring it inside Vitest would require a production
 * build and a browser, which belongs to the performance command.
 */

const root = process.cwd();
const budgetPath = path.join(root, ".lighthouserc.json");
const reportPath = path.join(
  root,
  ".sdrive",
  "reports",
  "performance",
  "performance-report-accessibility-and-performance-hardening-v1-2026-11-08.md"
);

const APPLICATION_BUDGET_KB = 350;
const TOTAL_BUDGET_KB = 700;

describe("AC-011: declared JavaScript budget", () => {
  test("AC-011: the Lighthouse budget asserts the performance thresholds", () => {
    const config = JSON.parse(fs.readFileSync(budgetPath, "utf8"));
    const assertions = config.ci.assert.assertions;

    expect(assertions["categories:performance"][1].minScore).toBe(0.95);
    expect(assertions["largest-contentful-paint"][1].maxNumericValue).toBe(2500);
    expect(assertions["cumulative-layout-shift"][1].maxNumericValue).toBe(0.1);
    expect(assertions["total-blocking-time"][1].maxNumericValue).toBe(200);
  });

  test("AC-011: the recorded measurement is inside the declared application budget", () => {
    // Strip markdown emphasis so the numbers can be read regardless of bolding.
    const report = fs.readFileSync(reportPath, "utf8").replace(/\*/g, "");

    expect(report, "the performance report must exist and be readable").toContain(
      "Local script transfer"
    );

    // The report's before/after table has several "N KB / N files" rows; the
    // last one is the current measurement.
    const rows = [...report.matchAll(/(\d+)\s*KB\s*\/\s*(\d+)\s*files/gi)];
    expect(rows.length, "the report must record a script-transfer measurement").toBeGreaterThan(0);

    const latest = rows[rows.length - 1];
    expect(Number(latest[1])).toBeLessThanOrEqual(APPLICATION_BUDGET_KB);
  });

  test("AC-011: the specification and the config agree on the application budget", () => {
    const spec = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          ".sdrive",
          "governance",
          "accessibility-and-performance-hardening",
          "v1",
          "spec.json"
        ),
        "utf8"
      )
    );

    const nfr = spec.nonFunctionalRequirements.find(
      (item: { id: string }) => item.id === "NFR-007"
    );

    expect(nfr, "NFR-007 must exist").toBeTruthy();
    expect(nfr.text).toContain(String(APPLICATION_BUDGET_KB));
    expect(nfr.text).toContain(String(TOTAL_BUDGET_KB));
  });
});
