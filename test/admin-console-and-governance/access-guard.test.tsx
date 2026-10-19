// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  useAuth: vi.fn(),
  useConvexQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/hooks/useConvexQuery", () => ({ useConvexQuery: mocks.useConvexQuery }));
vi.mock("@/convex/_generated/api", () => ({
  api: { users: { getCurrentUser: { __apiName: "users.getCurrentUser" } } },
}));

import AdminGuard from "@/components/AdminGuard";

function setUser(data: unknown, isLoading = false) {
  mocks.useConvexQuery.mockReturnValue({ data, isLoading });
}

describe("AC-001: the admin guard", () => {
  test("AC-001: an admin sees the protected console", () => {
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    setUser({ role: "admin" });

    render(
      <AdminGuard>
        <p>Protected console</p>
      </AdminGuard>
    );

    expect(screen.getByText("Protected console")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  test("AC-001: a super admin sees the protected console", () => {
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    setUser({ role: "super_admin" });

    render(
      <AdminGuard>
        <p>Protected console</p>
      </AdminGuard>
    );

    expect(screen.getByText("Protected console")).toBeInTheDocument();
  });

  test("AC-001: an ordinary user sees no protected content and is redirected", async () => {
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    setUser({ role: "user" });

    render(
      <AdminGuard>
        <p>Protected console</p>
      </AdminGuard>
    );

    expect(screen.queryByText("Protected console")).not.toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/admin"));
  });

  test("AC-001: a signed-out visitor is redirected and sees no protected content", async () => {
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    setUser(null);

    render(
      <AdminGuard>
        <p>Protected console</p>
      </AdminGuard>
    );

    expect(screen.queryByText("Protected console")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/admin"));
  });
});
