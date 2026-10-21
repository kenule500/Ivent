import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  MAX_EXPORT_ROWS,
  buildCsvExport,
  neutralizeCell,
  serializeCsv,
} from "../../lib/csv";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const DAY = 24 * 60 * 60 * 1000;

async function seedAdmin(t: ReturnType<typeof createConvexTest>, now = Date.now()) {
  return t.run(async (ctx) =>
    seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
      createdAt: now - 120 * DAY,
    })
  );
}

describe("CSV exports", () => {
  test("AC-016: exports carry the visible columns, active filters, a header row, and a dated filename", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      await seedUser(ctx, {
        name: "Ada Lovelace",
        tokenIdentifier: "token|ada",
        email: "ada@example.com",
        location: { city: "Lagos", country: "Nigeria" },
      });
      await seedUser(ctx, {
        name: "Bob Builder",
        tokenIdentifier: "token|bob",
        email: "bob@example.com",
      });
      const event = await seedEvent(ctx, adminId, {
        title: "Exportable event",
        startDate: now - DAY,
        createdAt: now - DAY,
        category: "tech",
        city: "Lagos",
        country: "Nigeria",
      });
      await seedRegistration(ctx, event, adminId, {
        registeredAt: now - DAY,
        attendeeName: "Ada Lovelace",
        attendeeEmail: "ada@example.com",
      });
    });

    const users = await t.withIdentity(adminIdentity).mutation(api.exports.generate, {
      module: "users",
      search: "ada",
    });
    expect(users.ok).toBe(true);
    if (!users.ok) throw new Error(users.message);

    expect(users.filename).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(users.rowCount).toBe(1);
    const [userHeader, userRow] = users.csv.trim().split("\r\n");
    expect(userHeader).toBe('"Name","Email","Role","Status","Joined","City","Country"');
    expect(userRow).toContain('"Ada Lovelace"');
    expect(userRow).toContain('"Lagos"');
    expect(users.csv).not.toContain("Bob Builder");

    const analytics = await t
      .withIdentity(adminIdentity)
      .mutation(api.exports.generate, {
        module: "analytics",
        filters: { start: now - 2 * DAY, end: now },
      });
    expect(analytics.ok).toBe(true);
    if (!analytics.ok) throw new Error(analytics.message);
    expect(analytics.filename).toMatch(/^analytics-\d{4}-\d{2}-\d{2}\.csv$/);
    const analyticsLines = analytics.csv.trim().split("\r\n");
    expect(analyticsLines[0]).toBe(
      '"Day","New users","New events","Registrations","Estimated revenue","Free revenue","Paid revenue"'
    );
    expect(analyticsLines.length).toBe(analytics.rowCount + 1);
    const analyticsRows = analyticsLines
      .slice(1)
      .map((line) => line.split(",").map((cell) => Number(cell.replaceAll('"', ""))));
    expect(analyticsRows.reduce((sum, row) => sum + row[2], 0)).toBe(1);
    expect(analyticsRows.reduce((sum, row) => sum + row[3], 0)).toBe(1);
    expect(analyticsRows.reduce((sum, row) => sum + row[4], 0)).toBe(0);

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "export.generated"))
        .collect()
    );
    expect(audit).toHaveLength(2);
    expect(audit.map((entry) => entry.targetLabel)).toEqual(
      expect.arrayContaining([
        "users export (1 rows)",
        expect.stringMatching(/^analytics export \(\d+ rows\)$/),
      ])
    );
  });

  test("AC-017: every field is quoted, quotes are doubled, dangerous prefixes are neutralised, and over-cap exports are refused", () => {
    const rows = [
      { value: "=2+2" },
      { value: "+cmd" },
      { value: "-1" },
      { value: "@SUM(A1)" },
      { value: "\tTabbed" },
      { value: "\rCarriage" },
      { value: "\nLine" },
      { value: 'He said "hi"' },
      { value: "a,b" },
    ];
    const csv = serializeCsv(rows, [
      { key: "value", header: "Value", value: (row) => row.value },
    ]);
    const lines = csv.split("\r\n").filter(Boolean);

    expect(lines[0]).toBe('"Value"');
    expect(lines[1]).toBe('"\t=2+2"');
    expect(lines[2]).toBe('"\t+cmd"');
    expect(lines[3]).toBe('"\t-1"');
    expect(lines[4]).toBe('"\t@SUM(A1)"');
    expect(lines[5]).toBe('"\t\tTabbed"');
    expect(lines[6]).toBe('"\t\rCarriage"');
    expect(lines[7]).toBe('"\t\nLine"');
    expect(lines[8]).toBe('"He said ""hi"""');
    expect(lines[9]).toBe('"a,b"');

    // Every field in every record is wrapped in double quotes.
    for (const line of lines) {
      expect(line).toMatch(/^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/);
    }

    expect(neutralizeCell("safe")).toBe("safe");
    expect(neutralizeCell("=unsafe")).toBe("\t=unsafe");
    expect(MAX_EXPORT_ROWS).toBe(10_000);

    const columns = [{ key: "value", header: "Value", value: (row: { value: string }) => row.value }];
    const overCap = buildCsvExport({
      module: "users",
      rows: [{ value: "a" }, { value: "b" }, { value: "c" }],
      columns,
      dateStamp: "2026-10-20",
      maxRows: 2,
    });
    expect(overCap).toEqual({
      ok: false,
      reason: "too_many_rows",
      rowCount: 3,
      cap: 2,
    });

    const empty = buildCsvExport({
      module: "users",
      rows: [],
      columns,
      dateStamp: "2026-10-20",
    });
    expect(empty).toMatchObject({ ok: false, reason: "empty", rowCount: 0 });

    const withinCap = buildCsvExport({
      module: "users",
      rows: [{ value: "a" }, { value: "b" }],
      columns,
      dateStamp: "2026-10-20",
      maxRows: 2,
    });
    expect(withinCap).toMatchObject({
      ok: true,
      filename: "users-2026-10-20.csv",
      rowCount: 2,
    });
  });
});
