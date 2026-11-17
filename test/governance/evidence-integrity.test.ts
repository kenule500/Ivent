// Evidence integrity guard (not an acceptance-criterion test).
//
// Review round 2 recorded F1 (high): test-evidence.json names commit e722562
// while HEAD was d1aa0a3, so the recorded evidence did not describe the tree
// being released. The trap is structural, not careless: evidence must record
// the commit it ran against, and evidence is itself committed, so a record
// inside a commit can never equal that commit's own SHA. Re-recording "at
// current HEAD" therefore re-arm the same finding on the next commit.
//
// This guard does not pretend to close the trap. `sdrive test` owns where the
// evidence records its commit. What the guard can do is fail loudly the moment a
// recorded commit stops being a legitimate one, so the staleness is caught by a
// run instead of by a reviewer. It accepts a recorded commit when either:
//
//   1. it equals HEAD exactly; or
//   2. every file changed between it and HEAD is a governance/artifact file
//      under .sdrive/ -- i.e. the recorded run measured exactly the product
//      code that HEAD ships, and only the wrong paperwork moved.
//
// Case 2 is still reported as a warning line, because it is the weaker claim of
// the two and a reviewer should see which one is being relied on. A product
// change after the recorded commit cannot pass either branch.
//
// Usage:  npx vitest run test/governance/evidence-integrity.test.ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const feature = "event-platform-expansion";
const evidencePath = join(
  root,
  ".sdrive",
  "governance",
  feature,
  "v1",
  "test-evidence.json"
);

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

// Paths whose contents the recorded evidence is actually a claim about. A
// change here invalidates the run; a change under .sdrive/ does not, because
// .sdrive/ holds the evidence paperwork itself, its reports and its audits.
const PRODUCT_PREFIXES = [
  "app/",
  "components/",
  "convex/",
  "lib/",
  "test/",
  "public/",
  "assets/",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
];

function isProduct(path: string): boolean {
  return PRODUCT_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix
  );
}

describe("test evidence integrity", () => {
  test("test-evidence.json commits to a tree HEAD has not moved past", () => {
    expect(existsSync(evidencePath)).toBe(true);

    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    const head = git("rev-parse", "HEAD");

    if (typeof evidence.commit !== "string" || evidence.commit.length === 0) {
      throw new Error(
        "test-evidence.json has no commit. Evidence that cannot name the tree it measured cannot clear a review."
      );
    }

    if (evidence.commit === head) {
      return;
    }

    // The recorded commit exists and is an ancestor of HEAD?
    let resolves = true;
    try {
      execFileSync("git", ["cat-file", "-e", `${evidence.commit}^{commit}`], {
        cwd: root,
        stdio: "ignore",
      });
    } catch {
      resolves = false;
    }
    if (!resolves) {
      throw new Error(
        `test-evidence.json records commit ${evidence.commit}, which does not exist in this repository.`
      );
    }

    const changed = execFileSync(
      "git",
      ["diff", "--name-only", evidence.commit, head],
      { cwd: root, encoding: "utf8" }
    )
      .trim()
      .split("\n")
      .filter(Boolean);

    const productChanges = changed.filter(isProduct);

    if (productChanges.length > 0) {
      throw new Error(
        [
          `test-evidence.json records commit ${evidence.commit} but HEAD is ${head},`,
          `and ${productChanges.length} product file(s) changed in between:`,
          ...productChanges.slice(0, 20).map((p) => `  ${p}`),
          "",
          "The recorded run no longer describes this tree. Re-record the evidence",
          "(`npx sdrive test ${feature}`) on a commit whose product code is HEAD's.",
        ].join("\n")
      );
    }

    // Governance-only drift: the run still measured this product code, but the
    // recorded SHA is not HEAD, so a reviewer reading the file cannot assume it is.
    console.warn(
      [
        `EVIDENCE-DRIFT: recorded commit ${evidence.commit} is not HEAD ${head},`,
        `but the ${changed.length} file(s) between them are all governance/artifacts:`,
        ...changed.slice(0, 20).map((p) => `  ${p}`),
        "The recorded assertions still describe HEAD's product code; the recorded",
        "commit does not. Re-record at a HEAD that does not move afterwards.",
      ].join("\n")
    );
    expect(changed.every((p) => !isProduct(p))).toBe(true);
  });
});
