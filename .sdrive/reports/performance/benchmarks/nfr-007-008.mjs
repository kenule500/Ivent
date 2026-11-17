// NFR-007 / NFR-008 benchmark harness (event-platform-expansion v1).
//
// NFR-007: event metadata is served without blocking the interactive body; a
// cached OG image SHOULD complete within 1.5 s at p95, and an uncached image
// within 3 s.
//
// NFR-008: live counts SHOULD reflect a remote check-in within 2 s at p95, an
// offline scan SHOULD acknowledge within 150 ms, and a 500-item sync batch
// SHOULD complete within 5 s.
//
// Scope: Convex handler execution on an in-memory convex-test backend. Not
// measured: HTTP round-trip, CDN, network RTT, satori/PNG raster, browser paint,
// and the client IndexedDB write that makes up the offline acknowledgement.
//
// FIXTURE DISCIPLINE: every case gets its own freshly seeded backend. A shared
// backend makes results meaningless, because every preceding mutation grows the
// document store and the next case then measures that growth instead of its own
// query. This cost real time to discover; do not collapse it back into one.
//
// Methodology: 7 iterations per case, drop the highest and lowest, median of the
// remaining 5.
import { build } from "esbuild";
import { readdirSync, statSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const benchDir = join(root, ".sdrive", "reports", "performance", "benchmarks");
const outDir = join(benchDir, ".nfr-007-008-build");
const RAW_TAG = process.env.NFR_TAG || "";
const RAW_OUT = join(benchDir, "nfr-007-008-raw" + RAW_TAG + ".json");

const ITERATIONS = Number(process.env.NFR_ITERATIONS || 7);
const EVENTS = Number(process.env.NFR_EVENTS || 25);
const ATTENDEES = Number(process.env.NFR_ATTENDEES || 600);
const SEARCH_TERM = "Ada";
const MAX_BATCH = 500;
const POSITION = Number(process.env.NFR_POSITION || 0);

function walk(dir, ext = /\.ts$/) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) found.push(...walk(fullPath, ext));
    else if (ext.test(entry)) found.push(fullPath);
  }
  return found;
}

function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function summarise(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const kept = sorted.slice(1, sorted.length - 1);
  const mid = Math.floor(kept.length / 2);
  const median =
    kept.length % 2 === 0 ? (kept[mid - 1] + kept[mid]) / 2 : kept[mid];
  const p95Index = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1);
  return {
    median,
    p95: sorted[p95Index],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    kept,
  };
}

function resetBuild() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "module" }));
}

function moduleMapFrom(dir) {
  const map = {};
  for (const file of walk(dir, /\.js$/)) {
    const rel = file
      .slice(dir.length + 1)
      .replace(/\\/g, "/")
      .replace(/\.js$/, "");
    map[rel] = () => import(pathToFileURL(file).href);
  }
  return map;
}

resetBuild();
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

// A fresh backend per case: identical volume, no growth from earlier cases.
async function freshBackend() {
  const { convexTest } = await import("convex-test");
  const schemaModule = await import(pathToFileURL(join(outDir, "schema.js")).href);
  const t = convexTest(schemaModule.default, moduleMapFrom(outDir));

  const rlDist = join(root, "node_modules", "@convex-dev", "rate-limiter", "dist", "component");
  const rlSchema = (await import(pathToFileURL(join(rlDist, "schema.js")).href)).default;
  t.registerComponent("rateLimiter", rlSchema, moduleMapFrom(rlDist));

  const ORGANIZER = "token|bench-organizer";
  const seeded = await t.run(async (ctx) => {
    const organizerId = await ctx.db.insert("users", {
      name: "Bench Organizer",
      email: "bench-organizer@example.test",
      tokenIdentifier: ORGANIZER,
      role: "user",
      hasCompletedOnboarding: true,
      freeEventsCreated: 0,
      createdAt: Date.now(),
    });
    const now = Date.now();
    let firstEventId = null;

    for (let e = 0; e < EVENTS; e += 1) {
      const eventId = await ctx.db.insert("events", {
        title: "Lagos Tech Summit " + (e + 1),
        description: "Benchmark fixture event for the door console.",
        slug: "bench-event-" + (e + 1),
        organizerId: organizerId,
        organizerName: "Bench Organizer",
        category: "tech",
        startDate: now + e * 3_600_000,
        endDate: now + e * 3_600_000 + 28_800_000,
        timezone: "Africa/Lagos",
        locationType: "physical",
        city: "Port Harcourt",
        state: "Rivers",
        country: "Nigeria",
        capacity: ATTENDEES * 2,
        ticketType: "free",
        registrationCount: Math.floor(ATTENDEES * 0.9),
        currency: "NGN",
        locale: "en",
        createdAt: now,
        updatedAt: now,
      });
      if (e === 0) firstEventId = eventId;

      for (let i = 0; i < ATTENDEES; i += 1) {
        const checkedIn = i < Math.floor(ATTENDEES * 0.4);
        await ctx.db.insert("registrations", {
          eventId: eventId,
          userId: organizerId,
          attendeeName: i % 5 === 0 ? "Ada Attendee " + i : "Guest " + i,
          attendeeEmail: "attendee" + i + "@example.test",
                    // POSITION controls where each event's scanned rows sit in the store.
          // 0 = every batch target is the first registrations inserted.
          qrCode: "EVT-" + e + "-" + String((i + POSITION) % ATTENDEES).padStart(8, "0"),
          checkedIn: checkedIn,
          checkedInAt: checkedIn ? now - i * 1000 - 1000 : undefined,
          status: i % 11 === 0 ? "cancelled" : "confirmed",
          registeredAt: now - i * 60_000,
        });
      }
    }

    return { organizerId: organizerId, eventId: firstEventId };
  });

  const organizer = t.withIdentity({
    tokenIdentifier: ORGANIZER,
    subject: "bench-organizer",
    issuer: "https://bench.local",
  });

  return { t: t, organizer: organizer, eventId: seeded.eventId, slug: "bench-event-1" };
}

const results = [];

// `prepare` runs per iteration after seeding; `sample` returns the timed ms.
async function measure(label, targetMs, prepare, sample) {
  const samples = [];
  for (let i = 0; i < ITERATIONS; i += 1) {
    const backend = await freshBackend();
    const ctx = await prepare(backend);
    const started = nowMs();
    await sample(ctx, backend);
    samples.push(nowMs() - started);
  }
  const s = summarise(samples);
  const verdict = s.p95 <= targetMs ? "PASS" : "FAIL";
  console.log(
    verdict +
      "  " +
      label.padEnd(40) +
      " p50 " +
      s.median.toFixed(1).padStart(9) +
      " ms  p95 " +
      s.p95.toFixed(1).padStart(9) +
      " ms  target <= " +
      targetMs +
      " ms"
  );
  results.push({ label: label, targetMs: targetMs, verdict: verdict, iterations: ITERATIONS, median: s.median, p95: s.p95, min: s.min, max: s.max, kept: s.kept });
  return s;
}

const noop = async () => {};

const readEvent = async (ctx, backend) => {
  await backend.organizer.query("events:getEventBySlug", { slug: backend.slug });
};

const readSnapshot = async (ctx, backend) => {
  await backend.organizer.query("door:getDoorSnapshot", { eventId: backend.eventId });
};

const readSearch = async (ctx, backend) => {
  await backend.organizer.query("door:searchDoorAttendees", {
    eventId: backend.eventId,
    term: SEARCH_TERM,
  });
};

const prepSync = async (backend) => {
  const items = [];
  const targetCount = Number(process.env.NFR_TARGETS || MAX_BATCH);
  for (let index = 0; index < targetCount; index += 1) {
    items.push({
      qrCode: "EVT-0-" + String(index).padStart(8, "0"),
      scannedAt: Date.now() - index * 1000,
    });
  }
  return { eventId: backend.eventId, items: items };
};

const runSync = async (ctx, backend) => {
  await backend.organizer.mutation("door:syncOfflineCheckIns", ctx);
};

console.log("Events: " + EVENTS + ", attendees each: " + ATTENDEES);
console.log("Rows per backend: " + EVENTS * ATTENDEES);
console.log("Iterations: " + ITERATIONS + "; a fresh backend is seeded for each\n");

await measure("NFR-007 cached OG: event read", 1500, noop, readEvent);
await measure("NFR-007 uncached OG: event read", 3000, noop, readEvent);
await measure("NFR-008 live counts: door snapshot", 2000, noop, readSnapshot);
await measure("NFR-008 attendee search (limit 50)", 2000, noop, readSearch);
await measure("NFR-008 500-item sync batch", 5000, prepSync, runSync);

console.log("");
const report = {
  feature: "event-platform-expansion",
  version: "v1",
  nfrs: ["NFR-007", "NFR-008"],
  backend: "in-memory convex-test, fresh per iteration",
  measuredAt: new Date().toISOString(),
  node: process.version,
  volume: {
    events: EVENTS,
    registrationsPerEvent: ATTENDEES,
    rows: EVENTS * ATTENDEES,
    syncBatch: MAX_BATCH,
  },
  iterations: ITERATIONS,
  results: results,
};
writeFileSync(RAW_OUT, JSON.stringify(report, null, 2));
console.log("Raw JSON: " + RAW_OUT);


