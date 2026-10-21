// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/users",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/hooks/usePlatformSettings", () => ({
  usePlatformSettings: () => ({
    settings: null,
    isLoading: false,
    country: "US",
    currency: "USD",
    timezone: "UTC",
    featureFlags: {
      commandPalette: true,
      reports: true,
      broadcasts: true,
      feedbackInbox: true,
      systemHealth: true,
    },
  }),
}));

import AdminLayout from "@/app/admin/layout";
import { PageHeader } from "@/components/admin/page-header";

describe("admin navigation", () => {
  test("AC-001: one config drives grouped destinations, active state, a mobile drawer, route-close and focus return", async () => {
    const user = userEvent.setup();
    const view = render(
      <AdminLayout>
        <p>Page content</p>
      </AdminLayout>
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
    for (const group of [
      "Overview",
      "Audience",
      "Events",
      "Operations",
      "Governance",
      "Personal",
    ]) {
      expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    }

    const users = screen.getByRole("link", { name: "Users" });
    expect(users).toHaveAttribute("href", "/admin/users");
    expect(users).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Events" })).not.toHaveAttribute(
      "aria-current"
    );

    const aside = screen.getByRole("complementary", { name: "Admin navigation" });
    expect(aside.className).toContain("-translate-x-full");
    expect(aside.className).toContain("md:translate-x-0");

    const trigger = screen.getByRole("button", { name: "Open sidebar" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(aside.className).toContain("translate-x-0");

    // A route change closes the drawer.
    mocks.pathname = "/admin/events";
    view.rerender(
      <AdminLayout>
        <p>Page content</p>
      </AdminLayout>
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(aside.className).toContain("-translate-x-full");
    expect(document.activeElement).toBe(trigger);

    // Re-opening and closing via the drawer control also returns focus.
    await user.click(trigger);
    expect(aside.className).toContain("translate-x-0");
    fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("AC-002: every page header carries title, purpose, breadcrumb, an action slot, and wrapping layout classes", () => {
    const { container } = render(
      <PageHeader
        title="Analytics"
        description="Understand attendance, revenue, and retention across the selected window."
        breadcrumb={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Analytics" },
        ]}
        actions={<button type="button">Export CSV</button>}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Analytics" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Understand attendance, revenue, and retention across the selected window."
      )
    ).toBeInTheDocument();

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin/dashboard"
    );
    expect(screen.getByText("Analytics", { selector: "span" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();

    const header = container.querySelector("header");
    expect(header?.className).toContain("space-y-3");
    const row = header?.querySelector("div");
    expect(row?.className).toContain("flex-col");
    expect(row?.className).toContain("sm:flex-row");
    expect(row?.querySelector(".min-w-0")).not.toBeNull();
    expect(row?.querySelector(".flex-wrap")).not.toBeNull();
  });
});
