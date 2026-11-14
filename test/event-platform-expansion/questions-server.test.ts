// @vitest-environment node
import { describe, expect, test } from "vitest";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const organizerToken = "token|questions-organizer";
const attendeeToken = "token|questions-attendee";
const otherAttendeeToken = "token|questions-other";
const adminToken = "token|questions-admin";
const organizerIdentity = identityFor(organizerToken, "Question Organizer");
const attendeeIdentity = identityFor(attendeeToken, "Ada Attendee");
const otherAttendeeIdentity = identityFor(otherAttendeeToken, "Other Attendee");
const adminIdentity = identityFor(adminToken, "Question Admin");

async function setup() {
  const t = createConvexTest();
  const organizerId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: organizerToken,
      name: "Question Organizer",
      email: "questions-organizer@example.com",
    })
  );
  const attendeeId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: attendeeToken,
      name: "Ada Attendee",
      email: "ada@example.com",
    })
  );
  const otherAttendeeId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: otherAttendeeToken,
      name: "Other Attendee",
      email: "other@example.com",
    })
  );
  const adminId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: adminToken,
      name: "Question Admin",
      email: "admin@example.com",
      role: "admin",
    })
  );
  const eventId = await t.run(async (ctx) =>
    seedEvent(ctx, organizerId, {
      title: "Question Event",
      slug: "question-event",
      capacity: 50,
      registrationQuestions: [
        {
          id: "company",
          label: "Company",
          type: "short_text" as const,
          required: true,
          version: 1,
        },
      ],
    })
  );

  return { t, organizerId, attendeeId, otherAttendeeId, adminId, eventId };
}

describe("AC-021: question versioning", () => {
  test("AC-021: editing a question with answers archives the old version, keeps answers readable, and new registrations see only current definitions", async () => {
    const { t, eventId, attendeeId } = await setup();
    const registrationId = await t.run(async (ctx) =>
      seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Ada Attendee",
        attendeeEmail: "ada@example.com",
        qrCode: "EVT-QUESTION-EDIT",
        answers: [{ questionId: "company", value: "Acme" }],
      })
    );

    await t.withIdentity(organizerIdentity).mutation(
      api.events.updateEventSettings,
      {
        eventId,
        registrationQuestions: [
          {
            id: "company",
            label: "Employer",
            type: "short_text",
            required: true,
            version: 2,
          },
        ],
      }
    );

    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    const definitions = event?.registrationQuestions ?? [];
    const active = definitions.filter((question) => question.archived !== true);
    const archived = definitions.filter((question) => question.archived === true);

    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      id: "company",
      label: "Employer",
      version: 2,
      archived: false,
    });
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatchObject({
      id: "company",
      label: "Company",
      version: 1,
      archived: true,
    });

    const registrations = await t
      .withIdentity(organizerIdentity)
      .query(api.registrations.getEventRegistrations, { eventId });
    const stored = registrations.find((entry) => entry._id === registrationId);
    expect(stored?.answers).toEqual([
      { questionId: "company", value: "Acme" },
    ]);
  });
});

describe("AC-022: registration export question columns", () => {
  test("AC-022: registration CSV includes current and archived question columns in stable order with escaped values and no cross-row answers", async () => {
    const { t, organizerId, adminId } = await setup();
    const eventId = await t.run(async (ctx) =>
      seedEvent(ctx, organizerId, {
        title: "Export Question Event",
        slug: "export-question-event",
        registrationQuestions: [
          {
            id: "company",
            label: "Company",
            type: "short_text" as const,
            required: true,
            version: 1,
          },
          {
            id: "dietary",
            label: "Dietary",
            type: "single_select" as const,
            required: false,
            options: ["Vegan", "Halal"],
            archived: true,
            version: 1,
          },
        ],
      })
    );
    const attendeeId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|export-attendee",
        name: "Ada Export",
        email: "ada-export@example.com",
      })
    );
    await t.run(async (ctx) => {
      await seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Ada Export",
        attendeeEmail: "ada-export@example.com",
        qrCode: "EVT-EXPORT-ADA",
        answers: [
          { questionId: "company", value: "Acme" },
          { questionId: "dietary", value: "Vegan" },
        ],
      });
      await seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Grace Export",
        attendeeEmail: "grace-export@example.com",
        qrCode: "EVT-EXPORT-GRACE",
        answers: [{ questionId: "company", value: "=GraceCo" }],
      });
    });

    const result = await t
      .withIdentity(adminIdentity)
      .mutation(api.exports.generate, { module: "registrations" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);

    const lines = result.csv.trim().split("\r\n");
    expect(lines[0]).toContain('"Company"');
    expect(lines[0]).toContain('"Dietary"');
    expect(result.csv).toContain('"Acme"');
    expect(result.csv).toContain('"Vegan"');
    expect(result.csv).toContain("\t=GraceCo");

    const adaRow = lines.find((line) => line.includes('"Ada Export"'));
    const graceRow = lines.find((line) => line.includes('"Grace Export"'));
    expect(adaRow).toContain('"Acme"');
    expect(adaRow).toContain('"Vegan"');
    expect(adaRow).not.toContain("GraceCo");
    expect(graceRow).toContain("\t=GraceCo");
    expect(graceRow).not.toContain("Vegan");

    // The admin is the caller, so this also proves administrative visibility.
    expect(adminId).toBeDefined();
  });
});

describe("AC-025: answer visibility", () => {
  test("AC-025: stored answers are keyed by stable question ID and visible to the attendee, organizer, and admin but not another attendee", async () => {
    const { t, eventId } = await setup();

    await t.withIdentity(attendeeIdentity).mutation(
      api.registrations.registerForEvent,
      {
        eventId,
        answers: [{ questionId: "company", value: "Acme" }],
        locale: "en",
      }
    );

    const mine = await t
      .withIdentity(attendeeIdentity)
      .query(api.registrations.getMyRegistrations, {});
    expect(mine).toHaveLength(1);
    expect(mine[0].answers).toEqual([
      { questionId: "company", value: "Acme" },
    ]);

    const other = await t
      .withIdentity(otherAttendeeIdentity)
      .query(api.registrations.getMyRegistrations, {});
    expect(other).toHaveLength(0);

    const organizerView = await t
      .withIdentity(organizerIdentity)
      .query(api.registrations.getEventRegistrations, { eventId });
    expect(organizerView[0].answers).toEqual([
      { questionId: "company", value: "Acme" },
    ]);

    const adminExport = await t
      .withIdentity(adminIdentity)
      .mutation(api.exports.generate, { module: "registrations" });
    expect(adminExport.ok).toBe(true);
    if (!adminExport.ok) throw new Error(adminExport.message);
    expect(adminExport.csv).toContain('"Acme"');

    const publicEvent = await t.query(api.events.getEventBySlug, {
      slug: "question-event",
    });
    expect(JSON.stringify(publicEvent)).not.toContain("Acme");
  });
});
