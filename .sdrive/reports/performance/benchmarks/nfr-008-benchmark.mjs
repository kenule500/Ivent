// NFR-008 benchmark harness (admin-dashboard-update v1).
//
// NFR-008: "Filtered analytics MUST return within 1.5 seconds p95 and the
// dashboard within 1 second p95 at 50,000 events and 500,000 registrations,
// using index ranges and bounded windows rather than collection scans."
//
// This seeds the declared volume into an in-memory convex-test backend, then
// times each query the NFR names. Methodology matches the performance agent's
// rule: at least 5 iterations, discard the highest and lowest, report the p50
// and p95 of the remainder. It is a query-layer (server execution) benchmark —
// it measures Convex handler work, not HTTP, network, or browser paint.
import { build } from "esbuild";
import { readdirSync, statSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const root = process.cwd();
const outDir = join(root, ".sdrive", "reports", "performance", "benchmarks", ".build");
const RAW_OUT = join(root, ".sdrive", "reports", "performance", "benchmarks", "nfr-008-raw.json");

function walk(dir, ext = /\.ts$/) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, ext));
    else if (ext.test(entry)) out.push(full);
  }
  return out;
}

// --- bundle convex so convex-test can load it from plain Node -----------------
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "module" }));
await build({
  entryPoints: walk(join(root, "convex")),
  outdir: outDir,
  outbase: join(root, "convex"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  logLevel: "error",
  external: ["convex", "@convex-dev/rate-limiter", "resend", "country-state-city"],
});

const moduleMap = {};
for (const file of walk(outDir, /\.js$/)) {
  const rel = file.slice(outDir.length + 1).replace(/\\/g, "/").replace(/\.js$/, "");
  moduleMap[rel] = () => import(pathToFileURL(file).href);
}

const { convexTest } = await import("convex-test");
const schema = (await import(pathToFileURL(join(outDir, "schema.js")).href)).default;
const t = convexTest(schema, moduleMap);

// --- volume, per NFR-008 ------------------------------------------------------
const EVENTS = Number(process.env.NFR_EVENTS || 50_000);
const REGISTRATIONS = Number(process.env.NFR_REGS || 500_000);
const USERS = Number(process.env.NFR_USERS || 50_000);
const DAY = 86_400_000;
const now = Date.now();

const CATEGORIES = ["tech", "music", "sports", "arts", "business"];
const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "United States", "United Kingdom"];
const CITIES = ["Lagos", "Abuja", "Accra", "Nairobi", "London"];

console.log(`Seeding ${USERS} users, ${EVENTS} events, ${REGISTRATIONS} registrations...`);
const seedStarted = performance.now();

await t.run(async (ctx) => {
  const adminId = await ctx.db.insert("users", {
    name: "Bench Admin", tokenIdentifier: "token|bench-admin", email: "bench-admin@example.test",
    hasCompletedOnboarding: true, freeEventsCreated: 0, role: "super_admin", createdAt: now,
  });

  const userIds = [adminId];
  for (let i = 0; i < USERS; i++) {
    userIds.push(
      await ctx.db.insert("users", {
        name: `User ${i}`, tokenIdentifier: `token|user-${i}`, email: `user${i}@example.test`,
        hasCompletedOnboarding: true, freeEventsCreated: 0, role: "user",
        createdAt: now - (i % 730) * DAY,
      })
    );
  }

  // Events spread across the last 730 days so the widest legal window is covered.
  const eventIds = [];
  for (let i = 0; i < EVENTS; i++) {
    const startDate = now - (i % 730) * DAY - (i % 86_400_000);
    eventIds.push(
      await ctx.db.insert("events", {
        title: `Benchmark Event ${i}`,
        description: "A description that is deliberately long enough for the schema validator.",
        slug: `benchmark-event-${i}`,
        organizerId: userIds[1 + (i % USERS)],
        organizerName: `Organizer ${i % USERS}`,
        category: CATEGORIES[i % CATEGORIES.length],
        startDate,
        endDate: startDate + 3 * 3_600_000,
        timezone: "UTC",
        locationType: "physical",
        city: CITIES[i % CITIES.length],
        state: "State",
        country: COUNTRIES[i % COUNTRIES.length],
        capacity: 50 + (i % 450),
        ticketType: i % 3 === 0 ? "paid" : "free",
        ticketPrice: i % 3 === 0 ? 5000 : undefined,
        registrationCount: 0,
        createdAt: startDate,
        updatedAt: startDate,
      })
    );
  }

  // Registrations spread across the last 730 days, linked to seeded events.
  for (let i = 0; i < REGISTRATIONS; i++) {
    await ctx.db.insert("registrations", {
      eventId: eventIds[i % eventIds.length],
      userId: userIds[1 + (i % USERS)],
      attendeeName: `Attendee ${i}`,
      attendeeEmail: `attendee${i}@example.test`,
      qrCode: `QR-${i}`,
      checkedIn: i % 4 === 0,
      checkedInAt: i % 4 === 0 ? now - (i % 30) * DAY : undefined,
      status: i % 11 === 0 ? "cancelled" : "confirmed",
      registeredAt: now - (i % 730) * DAY - (i % 86_400_000),
    });
  }
});

const seedMs = performance.now() - seedStarted;
console.log(`Seed complete in ${(seedMs / 1000).toFixed(1)} s`);

const admin = t.withIdentity({ tokenIdentifier: "token|bench-admin", subject: "bench-admin" });

// --- benchmark targets --------------------------------------------------------
// Analytics (NFR-008 target: p95 < 1500 ms) and dashboard (target: p95 < 1000 ms).
const window30 = { start: now - 30 * DAY, end: now };
const window365 = { start: now - 365 * DAY, end: now };

const cases = [
  { group: "analytics", name: "analytics:getSummary (30d)", fn: () => admin.query("analytics:getSummary", { filters: window30 }), target: 1500 },
  { group: "analytics", name: "analytics:getSummary (365d)", fn: () => admin.query("analytics:getSummary", { filters: window365 }), target: 1500 },
  { group: "analytics", name: "analytics:getTimeSeries (30d)", fn: () => admin.query("analytics:getTimeSeries", { filters: window30 }), target: 1500 },
  { group: "analytics", name: "analytics:getFunnel (30d)", fn: () => admin.query("analytics:getFunnel", { filters: window30 }), target: 1500 },
  { group: "analytics", name: "analytics:getCohorts (365d)", fn: () => admin.query("analytics:getCohorts", { filters: window365 }), target: 1500 },
  { group: "analytics", name: "analytics:getHeatmap (30d)", fn: () => admin.query("analytics:getHeatmap", { filters: window30 }), target: 1500 },
  { group: "analytics", name: "analytics:getBreakdown by category (30d)", fn: () => admin.query("analytics:getBreakdown", { filters: window30, dimension: "category" }), target: 1500 },
  { group: "analytics", name: "analytics:getBreakdown + filters (30d)", fn: () => admin.query("analytics:getBreakdown", { filters: { ...window30, categories: ["tech"], countries: ["Nigeria"], ticketTypes: ["paid"] }, dimension: "city" }), target: 1500 },
  { group: "dashboard", name: "commandCenter:getTrends (30d)", fn: () => admin.query("commandCenter:getTrends", { days: 30 }), target: 1000 },
  { group: "dashboard", name: "commandCenter:getActionQueue", fn: () => admin.query("commandCenter:getActionQueue", {}), target: 1000 },
  { group: "dashboard", name: "commandCenter:getToday", fn: () => admin.query("commandCenter:getToday", {}), target: 1000 },
];

const ITERATIONS = Number(process.env.NFR_ITER || 7); // odd, so discarding min and max still leaves a median

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1); // discard fastest and slowest
  const at = (q) => trimmed[Math.min(trimmed.length - 1, Math.floor(q * trimmed.length))];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: at(0.5),
    p95: at(0.95),
    mean: trimmed.reduce((s, v) => s + v, 0) / trimmed.length,
  };
}

const report = { feature: "admin-dashboard-update", version: "v1", nfr: "NFR-008", volume: { users: USERS, events: EVENTS, registrations: REGISTRATIONS }, iterations: ITERATIONS, seedMs: Math.round(seedMs), cases: [] };

for (const testCase of cases) {
  await testCase.fn(); // warm-up, not recorded
  const samples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const started = performance.now();
    await testCase.fn();
    samples.push(performance.now() - started);
  }
  const s = stats(samples);
  const pass = s.p95 <= testCase.target;
  report.cases.push({ ...testCase, target: undefined, p95TargetMs: testCase.target, samples: samples.map((v) => Number(v.toFixed(2))), ...s, pass });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${testCase.name.padEnd(42)} median ${s.median.toFixed(1)} ms  p95 ${s.p95.toFixed(1)} ms  (target ${testCase.target} ms)`
  );
}

writeFileSync(RAW_OUT, JSON.stringify(report, null, 2));
console.log(`\nRaw JSON: ${RAW_OUT}`);
