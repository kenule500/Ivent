// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmptyState } from "@/components/ui/empty-state";

describe("AC-006: an empty screen explains itself", () => {
  test("AC-006: the state names its cause rather than only its emptiness", () => {
    render(
      <EmptyState
        title="No tickets yet"
        reason="You have not registered for an event yet. Once you register, your ticket appears here with its QR code."
      />
    );

    expect(
      screen.getByRole("heading", { name: "No tickets yet" })
    ).toBeInTheDocument();
    expect(screen.getByText(/you have not registered/i)).toBeInTheDocument();
  });

  test("AC-006: a link action offers the next step", () => {
    render(
      <EmptyState
        title="No events yet"
        reason="Nothing has been published yet."
        action={{ label: "Create an event", href: "/create-event" }}
      />
    );

    const link = screen.getByRole("link", { name: "Create an event" });
    expect(link).toHaveAttribute("href", "/create-event");
  });

  test("AC-006: a button action is reachable without navigation", () => {
    render(
      <EmptyState
        title="No results"
        reason="No events match this filter."
        action={{ label: "Clear filters", onClick: () => {} }}
      />
    );

    expect(
      screen.getByRole("button", { name: "Clear filters" })
    ).toBeInTheDocument();
  });

  test("AC-006: the decorative icon is hidden from assistive technology", () => {
    const { container } = render(
      <EmptyState
        title="No tickets yet"
        reason="Nothing here yet."
        icon={<span data-testid="icon">ticket</span>}
      />
    );

    const iconHost = container.querySelector("[aria-hidden='true']");
    expect(iconHost).not.toBeNull();
    expect(iconHost?.contains(screen.getByTestId("icon"))).toBe(true);
  });
});
