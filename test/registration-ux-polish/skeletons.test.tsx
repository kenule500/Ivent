// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import { EventSkeleton } from "@/components/skeletons/event-skeleton";
import { TicketsSkeleton } from "@/components/skeletons/tickets-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import EventLoading from "@/app/(public)/events/[slug]/loading";
import MyTicketsLoading from "@/app/(main)/my-tickets/loading";

describe("AC-001: the layout appears before the data", () => {
  test("AC-001: the skeleton primitive is hidden from assistive technology", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);

    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).not.toBeNull();
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
  });

  test("AC-001: both route loading files render placeholder structure, not a blank screen", () => {
    const event = render(<EventLoading />);
    expect(event.container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(4);
    expect(screen.getByRole("status")).toHaveTextContent(/loading event details/i);
    event.unmount();

    const tickets = render(<MyTicketsLoading />);
    expect(tickets.container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(4);
    expect(screen.getByRole("status")).toHaveTextContent(/loading your tickets/i);
  });

  test("AC-001: the loading surface marks itself busy once for assistive technology", () => {
    const { container } = render(<MyTicketsLoading />);

    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
  });
});

describe("AC-007: placeholders carry their own dimensions", () => {
  test("AC-007: every skeleton block has explicit sizing so the swap cannot shift the page", () => {
    const { container } = render(<EventSkeleton />);

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="skeleton"]')
    );

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.className).toMatch(/\bh-/);
    }
  });
});

describe("AC-008: motion is suppressed on request", () => {
  test("AC-008: the shimmer stops when the user prefers reduced motion", () => {
    const { container } = render(<Skeleton />);

    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton?.className).toContain("animate-pulse");
    expect(skeleton?.className).toContain("motion-reduce:animate-none");
  });

  test("AC-008: the tickets skeleton inherits the reduced-motion behaviour", () => {
    const { container } = render(<TicketsSkeleton />);

    const first = container.querySelector('[data-slot="skeleton"]');
    expect(first?.className).toContain("motion-reduce:animate-none");
  });
});
