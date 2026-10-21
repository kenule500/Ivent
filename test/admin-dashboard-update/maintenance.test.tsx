// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  status: { maintenanceMode: true, maintenanceMessage: "Ticketing is being upgraded." },
  user: { role: "user" } as { role?: string } | null,
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    platform: { getPublicStatus: { __apiName: "platform.getPublicStatus" } },
    users: { getCurrentUser: { __apiName: "users.getCurrentUser" } },
  },
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: (query: { __apiName?: string }) => ({
    data: query.__apiName === "platform.getPublicStatus" ? mocks.status : mocks.user,
    isLoading: false,
    error: null,
  }),
}));

import { MaintenanceGate } from "@/components/maintenance-gate";

beforeEach(() => {
  mocks.status = {
    maintenanceMode: true,
    maintenanceMessage: "Ticketing is being upgraded.",
  };
  mocks.user = { role: "user" };
});

describe("maintenance notice", () => {
  test("AC-023: the public sees the mode and message, while admins and normal mode keep the app", () => {
    const view = render(
      <MaintenanceGate>
        <p>Public event listing</p>
      </MaintenanceGate>
    );

    expect(screen.getByRole("heading", { name: "Scheduled maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Ticketing is being upgraded.")).toBeInTheDocument();
    expect(screen.queryByText("Public event listing")).not.toBeInTheDocument();

    mocks.user = { role: "admin" };
    view.rerender(
      <MaintenanceGate>
        <p>Public event listing</p>
      </MaintenanceGate>
    );
    expect(screen.getByText("Public event listing")).toBeInTheDocument();
    expect(screen.queryByText("Scheduled maintenance")).not.toBeInTheDocument();

    mocks.user = { role: "user" };
    mocks.status = { maintenanceMode: false, maintenanceMessage: "Unused" };
    view.rerender(
      <MaintenanceGate>
        <p>Public event listing</p>
      </MaintenanceGate>
    );
    expect(screen.getByText("Public event listing")).toBeInTheDocument();
    expect(screen.queryByText("Scheduled maintenance")).not.toBeInTheDocument();
  });
});
