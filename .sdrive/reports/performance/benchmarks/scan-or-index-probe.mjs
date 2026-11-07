// Scan-or-index discriminator.
//
// Fixes the number of rows per day and grows the history (1, 2, 4, 8 years).
// A fixed 30-day window therefore always contains the same ~row count. If the
// query is served by an index range, its cost stays flat as history grows; if it
// scans the collection, cost rises with total rows. This separates "the app is
// scanning" from "the in-memory emulator is slow".
import { build } from "esbuild";
import { readdirSync, statSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const root = process.cwd();
const outDir = join(root, ".sdrive", "reports", "performance", "benchmarks", ".build");

function walk(dir, ext = /\.ts$/) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, ext));
    else if (ext.test(entry)) out.push(full);
  }
  return out;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "module" }));
await build({
  entryPoints: walk(join(root, "convex")),
  outdir: outDir, outbase: join(root, "convex"),
  bundle: true, format: "esm", platform: "node", target: "node20", logLevel: "error",
  external: ["convex", "@convex-dev/rate-limiter", "resend", "country-state-city"],
});

const moduleMap = {};
for (const file of walk(outDir, /\.js$/)) {
  const rel = file.slice(outDir.length + 1).replace(/\\/g, "/").replace(/\.js$/, "");
  moduleMap[rel] = () => import(pathToFileURL(file).href);
}

const { convexTest } = await import("convex-test");
const schema = (await import(pathToFileURL(join(outDir, "schema.js")).href)).default;
const { resolveAnalyticsScope } = await import(pathToFileURL(join(outDir, "analyticsFilters.js")).href);
const DAY = 86_400_000;
const now = Date.now();
const PER_DAY = 200; // constant density

console.log("years | total_rows | rows_in_30d | index read ms | scope ms");

for (const years of [1, 2, 4, 8]) {
  const total = years * 365 * PER_DAY;
  const t = convexTest(schema, moduleMap);
  await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      name: "A", tokenIdentifier: "token|s", email: "s@example.test",
      hasCompletedOnboarding: true, freeEventsCreated: 0, role: "super_admin", createdAt: now,
    });
    const event = await ctx.db.insert("events", {
      title: "E", description: "A description long enough for the validator.", slug: "e",
      organizerId: admin, organizerName: "A", category: "tech",
      startDate: now, endDate: now + 3_600_000, timezone: "UTC", locationType: "physical",
      country: "Nigeria", city: "Lagos", capacity: 10_000_000, ticketType: "free",
      registrationCount: 0, createdAt: now, updatedAt: now,
    });
    for (let i = 0; i < total; i++) {
      // i // PER_DAY = day offset, so density is exactly PER_DAY rows/day.
      await ctx.db.insert("registrations", {
        eventId: event, userId: admin, attendeeName: "A", attendeeEmail: "a@example.test",
        qrCode: `QR-${years}-${i}`, checkedIn: false, status: "confirmed",
        registeredAt: now - Math.floor(i / PER_DAY) * DAY,
      });
    }
  });

  const rawStart = performance.now();
  const inWindow = await t.run(async (ctx) =>
    ctx.db.query("registrations")
      .withIndex("by_registeredAt", (q) => q.gte("registeredAt", now - 30 * DAY).lte("registeredAt", now))
      .take(50_000)
  );
  const rawMs = performance.now() - rawStart;

  const scopeStart = performance.now();
  await t.run(async (ctx) => resolveAnalyticsScope(ctx, { start: now - 30 * DAY, end: now }));
  const scopeMs = performance.now() - scopeStart;

  console.log(
    `${String(years).padStart(5)} | ${String(total).padStart(10)} | ${String(inWindow.length).padStart(11)} | ${rawMs.toFixed(1).padStart(13)} | ${scopeMs.toFixed(1).padStart(8)}`
  );
}
