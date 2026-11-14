// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "@/convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const queueState = vi.hoisted(() => ({
  items: [] as Array<{
    id: string;
    eventId: string;
    qrCode: string;
    attendeeName: string;
    scannedAt: number;
  }>,
}));

vi.mock("@/lib/offline/db", () => ({
  readQueuedCheckIns: async (eventId: string) =>
    queueState.items.filter((item) => item.eventId === eventId),
  removeQueuedCheckIns: async (ids: string[]) => {
    queueState.items = queueState.items.filter((item) => !ids.includes(item.id));
  },
}));

import { syncDoorQueue } from "@/lib/offline/sync";

const organizerToken = "token|sync-organizer";
const organizerIdentity = identityFor(organizerToken, "Sync Organizer");

beforeEach(() => {
  queueState.items = [];
});

describe("AC-012: offline queue sync", () => {
  test("AC-012: queued scans sync idempotently with all five outcomes and a server count equal to successful check-ins", async () => {
    // Client replay: accepted outcomes leave the queue; unresolved outcomes stay.
    queueState.items = [
      {
        id: "q-ok",
        eventId: "event-a",
        qrCode: "SYNC-OK",
        attendeeName: "Sync OK",
        scannedAt: 10,
      },
      {
        id: "q-dup",
        eventId: "event-a",
        qrCode: "SYNC-DUP",
        attendeeName: "Sync Duplicate",
        scannedAt: 20,
      },
      {
        id: "q-miss",
        eventId: "event-a",
        qrCode: "SYNC-MISSING",
        attendeeName: "Sync Missing",
        scannedAt: 30,
      },
    ];

    const summary = await syncDoorQueue("event-a", async (items) => ({
      results: items.map((item) =>
        item.qrCode === "SYNC-MISSING"
          ? { qrCode: item.qrCode, outcome: "not_found" as const }
          : item.qrCode === "SYNC-DUP"
            ? { qrCode: item.qrCode, outcome: "already_checked_in" as const }
            : { qrCode: item.qrCode, outcome: "synced" as const }
      ),
    }));

    expect(summary.synced).toBe(2);
    expect(summary.failed).toBe(1);
    expect(queueState.items.map((item) => item.qrCode)).toEqual([
      "SYNC-MISSING",
    ]);

    const t = createConvexTest();
    const organizerId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: organizerToken,
        name: "Sync Organizer",
        email: "sync-organizer@example.com",
      })
    );
    const attendeeId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|sync-attendee",
        name: "Sync Attendee",
        email: "sync-attendee@example.com",
      })
    );
    const eventId = await t.run(async (ctx) =>
      seedEvent(ctx, organizerId, {
        slug: "sync-event",
        title: "Sync Event",
        capacity: 20,
      })
    );
    const otherEventId = await t.run(async (ctx) =>
      seedEvent(ctx, organizerId, {
        slug: "sync-other",
        title: "Other Event",
        capacity: 20,
      })
    );

    await t.run(async (ctx) => {
      await seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Sync Ok",
        qrCode: "SYNC-OK",
      });
      await seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Sync Duplicate",
        qrCode: "SYNC-DUP",
        checkedIn: true,
        checkedInAt: 5,
      });
      await seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Sync Cancelled",
        qrCode: "SYNC-CANCEL",
        status: "cancelled",
      });
      await seedRegistration(ctx, otherEventId, attendeeId, {
        attendeeName: "Sync Other",
        qrCode: "SYNC-OTHER",
      });
    });

    const items = [
      { qrCode: "SYNC-OK", scannedAt: 100 },
      { qrCode: "SYNC-DUP", scannedAt: 200 },
      { qrCode: "SYNC-CANCEL", scannedAt: 300 },
      { qrCode: "SYNC-OTHER", scannedAt: 400 },
      { qrCode: "SYNC-MISSING", scannedAt: 500 },
    ];

    const first = await t
      .withIdentity(organizerIdentity)
      .mutation(api.door.syncOfflineCheckIns, { eventId, items });

    expect(first.results.map((result) => result.outcome)).toEqual([
      "synced",
      "already_checked_in",
      "cancelled",
      "wrong_event",
      "not_found",
    ]);
    expect(first.synced).toBe(1);

    const snapshot = await t
      .withIdentity(organizerIdentity)
      .query(api.door.getDoorSnapshot, { eventId });
    expect(snapshot.counts.checkedIn).toBe(2);
    expect(snapshot.counts.confirmed).toBe(2);

    const second = await t
      .withIdentity(organizerIdentity)
      .mutation(api.door.syncOfflineCheckIns, { eventId, items });
    expect(second.synced).toBe(0);
    expect(second.results[0].outcome).toBe("already_checked_in");

    const after = await t
      .withIdentity(organizerIdentity)
      .query(api.door.getDoorSnapshot, { eventId });
    expect(after.counts.checkedIn).toBe(2);
  });
});
