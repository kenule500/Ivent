// NFR-009 accessibility harness (admin-dashboard-update v1).
//
// NFR-009: "Every new screen MUST meet WCAG 2.1 AA: visible focus, 4.5:1 text
// contrast, labelled controls, keyboard-complete palette and dialogs, chart
// data-table alternatives, and status messages announced without relying on
// colour."
//
// This renders the real shared admin components to static HTML with
// react-dom/server, mounts them in jsdom, and runs axe-core (WCAG 2.1 A + AA
// rule tags). It is an automated subset of WCAG — it cannot verify a manual
// keyboard walkthrough, screen-reader phrasing, or reduced-motion, and the
// report says so. Anything axe reports is a genuine finding, reproduced from the
// component source, not a guess.
import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const root = process.cwd();
const outDir = join(root, ".sdrive", "reports", "accessibility", "benchmarks", ".build");
const RAW_OUT = join(root, ".sdrive", "reports", "accessibility", "benchmarks", "nfr-009-raw.json");

// One entry that re-exports the components under test. esbuild bundles JSX/TSX
// and the "@/" path alias for us; jsdom and axe then run against the result.
const entry = join(outDir, "entry.tsx");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "module" }));
writeFileSync(
  entry,
  `export { PageHeader } from "${join(root, "components/admin/page-header").replace(/\\/g, "/")}";
export { PanelState } from "${join(root, "components/admin/panel-state").replace(/\\/g, "/")}";
export { DataTableAlt } from "${join(root, "components/admin/data-table-alt").replace(/\\/g, "/")}";
export { TrendCard } from "${join(root, "components/admin/trend-card").replace(/\\/g, "/")}";
export { ChartCard } from "${join(root, "components/admin/chart-card").replace(/\\/g, "/")}";
`
);

await build({
  entryPoints: [entry],
  outfile: join(outDir, "components.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  jsx: "automatic",
  logLevel: "error",
  // `next/link` is CommonJS and pulls in the Next.js client runtime; a tiny
  // anchor stub keeps the render in plain Node while preserving the accessible
  // name axe-core inspects.
  alias: { "@": root, "next/link": join(root, ".sdrive/reports/accessibility/benchmarks/stubs/next-link.tsx") },
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "lucide-react", "recharts", "@base-ui/react", "class-variance-authority", "clsx", "tailwind-merge", "date-fns"],
});

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { JSDOM } = await import("jsdom");
const C = await import(pathToFileURL(join(outDir, "components.js")).href);

const { ArrowUpRight } = await import("lucide-react");

function render(element) {
  return renderToStaticMarkup(element);
}

// Each case is a real component rendered with realistic props.
const cases = [
  {
    name: "PageHeader (dashboard)",
    html: render(
      React.createElement(C.PageHeader, {
        title: "Operations dashboard",
        description: "What changed and what needs attention.",
        breadcrumb: [{ label: "Admin", href: "/admin" }, { label: "Dashboard" }],
      })
    ),
  },
  {
    name: "PanelState (empty)",
    html: render(
      React.createElement(C.PanelState, {
        empty: true,
        emptyTitle: "Nothing needs attention",
        emptyDescription: "The action queue is clear.",
      }, null)
    ),
  },
  {
    name: "PanelState (error with retry)",
    html: render(
      React.createElement(C.PanelState, {
        error: "The action queue could not be loaded.",
        onRetry: () => {},
      }, null)
    ),
  },
  {
    name: "DataTableAlt (chart alternative)",
    html: render(
      React.createElement(C.DataTableAlt, {
        caption: "Registrations per day",
        columns: [
          { key: "day", label: "Day" },
          { key: "count", label: "Registrations", align: "right" },
        ],
        rows: [
          { key: "1", cells: ["2026-11-01", 120] },
          { key: "2", cells: ["2026-11-02", 98] },
        ],
      })
    ),
  },
  {
    name: "TrendCard (positive delta)",
    html: render(
      React.createElement(C.TrendCard, {
        label: "Registrations",
        current: 1200,
        previous: 1000,
        sparkline: [10, 20, 30, 40],
        windowLabel: "vs previous 30 days",
        formatValue: (v) => String(v),
        icon: ArrowUpRight,
      })
    ),
  },
  {
    name: "TrendCard (new / zero baseline)",
    html: render(
      React.createElement(C.TrendCard, {
        label: "Estimated revenue",
        current: 500,
        previous: 0,
        sparkline: [0, 100, 300, 500],
        windowLabel: "vs previous 30 days",
        formatValue: (v) => `$${v}`,
        icon: ArrowUpRight,
      })
    ),
  },
  {
    name: "ChartCard (with data-table alternative)",
    html: render(
      React.createElement(C.ChartCard, {
        title: "Check-in rate over time",
        description: "Share of confirmed attendees scanned per day.",
        table: {
          caption: "Check-in rate per day",
          columns: [
            { key: "day", label: "Day" },
            { key: "rate", label: "Rate", align: "right" },
          ],
          rows: [
            { key: "1", cells: ["2026-11-01", "82%"] },
            { key: "2", cells: ["2026-11-02", "88%"] },
          ],
        },
      },
      React.createElement("div", { "aria-hidden": "true" }, "chart goes here")
    )),
  },
];

const { default: axe } = await import("axe-core");

// Negative control: a deliberately inaccessible fragment. If axe does not flag
// this, the harness is not actually evaluating anything and the clean results
// below would be worthless.
const control = new JSDOM(
  `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body><img src="x.png"><button></button></body></html>`,
  { pretendToBeVisual: true, runScripts: "dangerously" }
);
control.window.eval(axe.source);
const controlResults = await control.window.axe.run(control.window.document.body, {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
});
const controlIds = controlResults.violations.map((v) => v.id);
console.log(`CONTROL (expected to fail): ${controlIds.length} violation group(s) -> ${controlIds.join(", ") || "NONE"}`);
if (controlIds.length === 0) {
  console.error("Harness invalid: axe found nothing even in the negative control.");
  process.exit(1);
}

const results = [];
let totalViolations = 0;

for (const testCase of cases) {
  const dom = new JSDOM(`<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${testCase.html}</body></html>`, {
    pretendToBeVisual: true,
    // axe-core is a browser bundle; it must execute inside the jsdom window.
    runScripts: "dangerously",
  });
  const { window } = dom;
  window.eval(axe.source);
  const axeResults = await window.axe.run(window.document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  const violations = axeResults.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
  totalViolations += violations.length;
  const status = violations.length === 0 ? "PASS" : "FAIL";
  console.log(`${status}  ${testCase.name.padEnd(42)} ${violations.length} violation group(s)`);
  for (const v of violations) console.log(`        - [${v.impact}] ${v.id}: ${v.help} (${v.nodes} node(s))`);
  results.push({ name: testCase.name, violations });
}

writeFileSync(
  RAW_OUT,
  JSON.stringify(
    {
      feature: "admin-dashboard-update",
      version: "v1",
      nfr: "NFR-009",
      tool: `axe-core ${(await import("axe-core/package.json", { with: { type: "json" } })).default.version}`,
      standard: "WCAG 2.1 A + AA (automated subset)",
      negativeControl: { expectedViolations: true, found: controlIds },
      caseCount: cases.length,
      totalViolationGroups: totalViolations,
      results,
    },
    null,
    2
  )
);
console.log(`\nTotal violation groups: ${totalViolations}`);
console.log(`Raw JSON: ${RAW_OUT}`);
