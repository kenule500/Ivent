// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EventCard from "@/components/event-card";
import AdminAwareLayout from "@/components/AdminAwareLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
}));

vi.mock("@/components/header", () => ({
  default: () => <header data-testid="site-header" />,
}));

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="site-footer" />,
}));

vi.mock("@/components/maintenance-gate", () => ({
  MaintenanceGate: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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

describe("AC-001 / AC-002: keyboard operable cards", () => {
  test("AC-001: a clickable card is a named control in the tab order", () => {
    render(<EventCard event={event} onClick={() => {}} />);

    const card = screen.getByRole("button", { name: /view lagos tech summit/i });
    expect(card).toHaveAttribute("tabindex", "0");
    expect(card).toHaveClass("focus-visible:ring-2");
  });

  test("AC-001: Enter activates the card", () => {
    const onClick = vi.fn();
    render(<EventCard event={event} onClick={onClick} />);

    fireEvent.keyDown(
      screen.getByRole("button", { name: /view lagos tech summit/i }),
      { key: "Enter" }
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("AC-001: Space activates the card", () => {
    const onClick = vi.fn();
    render(<EventCard event={event} onClick={onClick} />);

    fireEvent.keyDown(
      screen.getByRole("button", { name: /view lagos tech summit/i }),
      { key: " " }
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("AC-001: a static card is not a control", () => {
    render(<EventCard event={event} />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("AC-002: dialogs take and return focus", () => {
  test("AC-002: opening a dialog moves focus inside it", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Register for Event</DialogTitle>
          <DialogDescription>Confirm your details.</DialogDescription>
          <button>Confirm</button>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  test("AC-002: the dialog exposes its title and keeps focus inside", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Register for Event</DialogTitle>
          <DialogDescription>Confirm your details.</DialogDescription>
          <button>Confirm</button>
        </DialogContent>
      </Dialog>
    );

    const dialog = await screen.findByRole("dialog");

    // The accessible name comes from DialogTitle, and focus lands inside the
    // popup rather than staying on the page behind it.
    expect(dialog).toHaveAccessibleName(/register for event/i);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

describe("AC-003: landmarks", () => {
  test("AC-003: one main landmark, skip link first, footer outside main", () => {
    const { container } = render(
      <AdminAwareLayout>
        <p>content</p>
      </AdminAwareLayout>
    );

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.id).toBe("main");
    expect(main?.getAttribute("tabindex")).toBe("-1");

    const skipLink = container.querySelector('a[href="#main"]');
    expect(skipLink).not.toBeNull();

    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer?.closest("main")).toBeNull();

    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
