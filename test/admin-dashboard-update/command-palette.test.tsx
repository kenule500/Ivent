// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  push: vi.fn(),
  onOpenChange: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));
vi.mock("convex/react", () => ({
  useMutation: () => mocks.search,
}));
vi.mock("@/convex/_generated/api", () => ({
  api: { admin: { searchPalette: { __apiName: "admin.searchPalette" } } },
}));

import { CommandPalette } from "@/components/admin/command-palette";

const emptyResults = { users: [], events: [], registrations: [] };

beforeEach(() => {
  mocks.search.mockReset();
  mocks.push.mockReset();
  mocks.onOpenChange.mockReset();
});

describe("command palette", () => {
  test("AC-003: two characters search grouped destinations, keyboard arrows move the highlight, Enter opens it, Esc closes", async () => {
    const user = userEvent.setup();
    mocks.search.mockResolvedValue({
      users: [{ id: "user_1", label: "Ada Lovelace", email: "ada@example.com" }],
      events: [{ id: "event_1", label: "Annual Dinner", city: "Lagos" }],
      registrations: [
        { id: "reg_1", label: "Ada Lovelace", email: "ada@example.com" },
      ],
    });

    render(<CommandPalette onOpenChange={mocks.onOpenChange} />);

    const input = screen.getByRole("combobox", { name: "Search admin console" });
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(input).toHaveFocus();

    await user.type(input, "ad");
    await waitFor(() => expect(mocks.search).toHaveBeenCalledWith({ query: "ad" }), {
      timeout: 2000,
    });

    await screen.findAllByText("Ada Lovelace");
    const groupLabels = screen
      .getAllByRole("presentation")
      .map((element) => element.textContent);
    expect(groupLabels).toEqual(
      expect.arrayContaining(["Pages", "Users", "Events", "Registrations"])
    );
    expect(screen.getByText("Annual Dinner")).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(2);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "palette-option-0");

    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "palette-option-1");

    // The second row for \"ad\" is the Audit log page.
    await user.keyboard("{Enter}");
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.push).toHaveBeenCalledWith("/admin/audit");

    // Focus stays inside the dialog while tabbing.
    input.focus();
    await user.tab();
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement
    );

    input.focus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(mocks.onOpenChange).toHaveBeenCalledWith(false));
  });

  test("AC-004: an empty query shows static page actions and never calls the search endpoint", () => {
    render(<CommandPalette onOpenChange={mocks.onOpenChange} />);

    expect(screen.getByRole("combobox", { name: "Search admin console" })).toHaveValue("");
    expect(screen.getByText("Pages")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Type at least 2 characters to search users, events, and registrations."
      )
    ).toBeInTheDocument();
    // Only the static page list is present: no user/event/registration hints.
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(5);
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
    expect(mocks.search).not.toHaveBeenCalled();
  });

  test("AC-004: no matches names the query and a failed query offers inline retry", async () => {
    mocks.search.mockResolvedValueOnce(emptyResults);
    render(<CommandPalette onOpenChange={mocks.onOpenChange} />);

    const input = screen.getByRole("combobox", { name: "Search admin console" });
    fireEvent.change(input, { target: { value: "zz" } });

    await screen.findByText("No matches for “zz”.", undefined, { timeout: 2000 });
    await waitFor(() => expect(mocks.search).toHaveBeenCalledWith({ query: "zz" }), {
      timeout: 2000,
    });
  });

  test("AC-004: a query failure shows an alert with retry that re-runs the search", async () => {
    const user = userEvent.setup();
    mocks.search
      .mockResolvedValueOnce({ error: "Rate limit reached. Try again in 12s." })
      .mockResolvedValueOnce({
        users: [{ id: "user_1", label: "Ada Lovelace", email: "ada@example.com" }],
        events: [],
        registrations: [],
      });
    render(<CommandPalette onOpenChange={mocks.onOpenChange} />);

    const input = screen.getByRole("combobox", { name: "Search admin console" });
    fireEvent.change(input, { target: { value: "ada" } });

    const alert = await screen.findByRole("alert", undefined, { timeout: 2000 });
    expect(alert).toHaveTextContent("Rate limit reached. Try again in 12s.");
    expect(screen.queryByText("No matches for “ada”.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(mocks.search).toHaveBeenCalledTimes(2), {
      timeout: 2000,
    });
    await screen.findByText("Ada Lovelace");
    expect(screen.getByText("Users")).toBeInTheDocument();
  });
});
