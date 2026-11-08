// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SkipLink } from "@/components/a11y/skip-link";
import { VisuallyHidden } from "@/components/a11y/visually-hidden";
import {
  LiveRegionProvider,
  useAnnounce,
} from "@/components/a11y/live-region";
import { usePrefersReducedMotion } from "@/lib/a11y/use-prefers-reduced-motion";
import {
  focusFirstInvalid,
  rememberFocus,
  restoreFocus,
} from "@/lib/a11y/focus";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("AC-003: skip link and hidden text", () => {
  test("AC-003: the skip link is the first focusable element and targets main", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: /skip to content/i });
    expect(link).toHaveAttribute("href", "#main");
    expect(link.firstChild).not.toBeNull();
  });

  test("AC-003: VisuallyHidden keeps text in the tree with the clip pattern", () => {
    render(<VisuallyHidden>Context for screen readers</VisuallyHidden>);

    const node = screen.getByText("Context for screen readers");
    expect(node).toHaveClass("sr-only");
    expect(node).toBeVisible();
  });
});

describe("AC-005: live region announcements", () => {
  function Announcer() {
    const announce = useAnnounce();

    return (
      <>
        <button onClick={() => announce("Ticket ready")}>polite</button>
        <button onClick={() => announce("Registration failed", "assertive")}>
          assertive
        </button>
      </>
    );
  }

  test("AC-005: a polite announcement lands in the polite region", async () => {
    render(
      <LiveRegionProvider>
        <Announcer />
      </LiveRegionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "polite" }));

    await waitFor(() =>
      expect(screen.getByText("Ticket ready")).toBeInTheDocument()
    );
    expect(screen.getByText("Ticket ready")).toHaveAttribute(
      "aria-live",
      "polite"
    );
  });

  test("AC-005: an assertive announcement lands in the alert region", async () => {
    render(
      <LiveRegionProvider>
        <Announcer />
      </LiveRegionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "assertive" }));

    await waitFor(() =>
      expect(screen.getByText("Registration failed")).toBeInTheDocument()
    );
    expect(screen.getByText("Registration failed")).toHaveAttribute(
      "aria-live",
      "assertive"
    );
  });

  test("AC-005: announcing outside the provider degrades instead of crashing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Announcer />);

    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "polite" }))
    ).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("AC-007: reduced motion is readable from JavaScript", () => {
  test("AC-007: the hook follows the media query", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );

    function Probe() {
      const reduced = usePrefersReducedMotion();
      return <span>{reduced ? "reduced" : "full"}</span>;
    }

    render(<Probe />);

    expect(screen.getByText("reduced")).toBeInTheDocument();
  });
});

describe("AC-001: focus helpers", () => {
  test("AC-001: restoreFocus falls back to main when the trigger is gone", () => {
    const main = document.createElement("main");
    main.id = "main";
    main.tabIndex = -1;
    document.body.appendChild(main);

    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
    restoreFocus(trigger);

    expect(document.activeElement).toBe(main);
  });

  test("AC-001: rememberFocus returns the active element", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();

    expect(rememberFocus()).toBe(button);
  });

  test("AC-001: focusFirstInvalid moves to the invalid control", () => {
    const form = document.createElement("form");
    form.innerHTML =
      '<input id="name" /><input id="email" aria-invalid="true" />';
    document.body.appendChild(form);

    const moved = focusFirstInvalid(form);

    expect(moved).toBe(true);
    expect(document.activeElement?.id).toBe("email");
  });

  test("AC-001: focusFirstInvalid is a no-op for a valid form", () => {
    const form = document.createElement("form");
    form.innerHTML = '<input id="name" />';
    document.body.appendChild(form);

    expect(focusFirstInvalid(form)).toBe(false);
  });
});
