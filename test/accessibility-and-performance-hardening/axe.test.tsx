// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import * as React from "react";
import { render } from "@testing-library/react";
import axe from "axe-core";

import { SkipLink } from "@/components/a11y/skip-link";
import { VisuallyHidden } from "@/components/a11y/visually-hidden";
import { LiveRegionProvider } from "@/components/a11y/live-region";
import EventCard from "@/components/event-card";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const event = {
  _id: "event_1",
  title: "Lagos Tech Summit",
  coverImage: null,
  themeColor: "#334155",
  category: "technology",
  startDate: Date.now() + 86_400_000,
  locationType: "physical",
  city: "Lagos",
  state: "Lagos",
  country: "NG",
  registrationCount: 12,
  capacity: 100,
  ticketType: "free",
} as unknown as React.ComponentProps<typeof EventCard>["event"];

/**
 * AC-010: axe must report zero WCAG 2.1 A/AA violations on the reference
 * surface. `color-contrast` is disabled because jsdom has no layout engine, so
 * axe cannot compute rendered colours; AC-006 covers the tokens directly and the
 * five-page sweep runs in the Lighthouse/e2e job.
 */
async function violationsFor(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });

  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe("AC-010: axe finds no WCAG 2.1 A/AA violations", () => {
  test("AC-010: the skip link and hidden text are clean", async () => {
    expect(
      await violationsFor(
        <div>
          <SkipLink />
          <VisuallyHidden>Hidden context</VisuallyHidden>
          <main id="main">content</main>
        </div>
      )
    ).toEqual([]);
  });

  test("AC-010: an interactive event card is clean", async () => {
    expect(
      await violationsFor(<EventCard event={event} onClick={() => {}} />)
    ).toEqual([]);
  });

  test("AC-010: the live region container is clean", async () => {
    expect(
      await violationsFor(
        <LiveRegionProvider>
          <main id="main">
            <h1>My tickets</h1>
            <p>Tickets appear here.</p>
          </main>
        </LiveRegionProvider>
      )
    ).toEqual([]);
  });
});
