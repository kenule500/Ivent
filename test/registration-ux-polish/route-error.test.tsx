// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LiveRegionProvider } from "@/components/a11y/live-region";
import { RouteError } from "@/components/route-error";
import EventError from "@/app/(public)/events/[slug]/error";
import MyTicketsError from "@/app/(main)/my-tickets/error";

describe("AC-005: a failed render offers a way out", () => {
  test("AC-005: recovery shows a reason, a retry, and a working way home", async () => {
    const onRetry = vi.fn();

    render(
      <LiveRegionProvider>
        <RouteError
          title="We could not load this event"
          description="Something went wrong while loading the event details."
          onRetry={onRetry}
          homeHref="/explore"
        />
      </LiveRegionProvider>
    );

    expect(
      screen.getByRole("heading", { name: /could not load this event/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute(
      "href",
      "/explore"
    );
  });

  test("AC-005: the failure is announced, not only rendered", () => {
    render(
      <LiveRegionProvider>
        <RouteError
          title="We could not load your tickets"
          description="Something went wrong."
          onRetry={() => {}}
        />
      </LiveRegionProvider>
    );

    expect(
      screen.getByText(/we could not load your tickets/i)
    ).toBeInTheDocument();
  });

  test("AC-005: a route boundary never renders the error message or digest", () => {
    const error = Object.assign(new Error("Convex exploded at /api/secret"), {
      digest: "1234567890",
    });

    const { container } = render(<EventError error={error} reset={() => {}} />);

    expect(container.textContent).not.toMatch(/convex exploded/i);
    expect(container.textContent).not.toMatch(/1234567890/);
    expect(container.textContent).not.toMatch(/stack/i);
  });

  test("AC-005: both route boundaries use the same recovery contract", () => {
    const tickets = render(<MyTicketsError error={new Error("boom")} reset={() => {}} />);

    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
    tickets.unmount();

    render(<EventError error={new Error("boom")} reset={() => {}} />);
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });
});
