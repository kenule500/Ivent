import { describe, expect, test } from "vitest";

import {
  escapeHtml,
  isTransactional,
  lifecycleKey,
  renderLifecycleEmail,
  type LifecycleContext,
} from "../../convex/lifecycleTemplates";

const context: LifecycleContext = {
  attendeeName: "Ada Lovelace",
  eventTitle: "Lagos Tech Summit",
  eventDate: "2026-12-01T18:00:00.000Z",
  eventLocation: "Landmark Centre, Lagos",
  ticketCode: "EVT-1-ABCD1234",
  ticketUrl: "https://ivent.example/my-tickets",
  feedbackUrl: "https://ivent.example/feedback?event=lagos-tech-summit",
  emailOptOut: false,
};

describe("AC-001: the confirmation identifies the event and the ticket", () => {
  test("AC-001: subject names the event and the body carries date, location and code", () => {
    const email = renderLifecycleEmail("registration_confirmation", context);

    expect(email.subject).toContain("Lagos Tech Summit");
    expect(email.html).toContain("Landmark Centre, Lagos");
    expect(email.html).toContain("EVT-1-ABCD1234");
    expect(email.text).toContain("EVT-1-ABCD1234");
  });

  test("AC-003: the thank-you offers a feedback link", () => {
    const email = renderLifecycleEmail("post_event_thankyou", context);

    expect(email.subject).toContain("Thanks");
    expect(email.html).toContain("feedback?event=lagos-tech-summit");
  });
});

describe("AC-008: content is escaped and single-recipient", () => {
  test("AC-008: interpolated HTML is escaped, not executed", () => {
    const hostile = renderLifecycleEmail("registration_confirmation", {
      ...context,
      attendeeName: '<img src=x onerror="alert(1)">',
      eventTitle: "Tom & Jerry <script>alert(1)</script>",
    });

    expect(hostile.html).not.toContain("<img");
    expect(hostile.html).not.toContain("<script>");
    expect(hostile.html).toContain("&lt;img");
    expect(hostile.html).toContain("&amp;");
  });

  test("AC-008: escapeHtml covers the five HTML metacharacters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  test("AC-008: a rendered email contains only its own context", () => {
    const email = renderLifecycleEmail("reminder_24h", context);

    expect(email.html).toContain("Ada Lovelace");
    expect(email.html).not.toContain("grace@example.com");
    expect(email.text.match(/@/g)?.length ?? 0).toBe(0);
  });
});

describe("NFR-001: only the confirmation is transactional", () => {
  test("NFR-001: the confirmation bypasses the preference and the rest honour it", () => {
    expect(isTransactional("registration_confirmation")).toBe(true);
    expect(isTransactional("reminder_24h")).toBe(false);
    expect(isTransactional("post_event_thankyou")).toBe(false);
    expect(isTransactional("feedback_request")).toBe(false);
  });
});

describe("FR-005: the idempotency key", () => {
  test("FR-005: the key is stable and distinct per template", () => {
    expect(lifecycleKey("reg_1", "reminder_24h")).toBe("reg_1:reminder_24h");
    expect(lifecycleKey("reg_1", "reminder_24h")).toBe(
      lifecycleKey("reg_1", "reminder_24h")
    );
    expect(lifecycleKey("reg_1", "reminder_24h")).not.toBe(
      lifecycleKey("reg_1", "post_event_thankyou")
    );
  });
});
