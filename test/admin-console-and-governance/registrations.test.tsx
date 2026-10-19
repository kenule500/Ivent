// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  useConvexQuery: vi.fn(),
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
  useConvexMutation: () => ({ mutate: mocks.mutate, isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    admin: {
      getAllRegistrations: { __apiName: "admin.getAllRegistrations" },
      getAllEvents: { __apiName: "admin.getAllEvents" },
    },
    registrations: { cancelRegistration: { __apiName: "registrations.cancelRegistration" } },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import AdminRegistrationsPage from "@/app/admin/registrations/page";

const now = Date.now();

beforeEach(() => {
  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockImplementation((ref: { __apiName?: string }) => {
    if (ref.__apiName === "admin.getAllEvents") {
      return { data: [{ _id: "event_1", title: "Tech Summit" }], isLoading: false };
    }
    return {
      data: [
        {
          _id: "reg_ada",
          eventId: "event_1",
          attendeeName: "Ada Lovelace",
          attendeeEmail: "ada@example.com",
          qrCode: "EVT-111-AAAAAAAA",
          status: "confirmed",
          checkedIn: true,
          registeredAt: now,
        },
        {
          _id: "reg_cara",
          eventId: "event_1",
          attendeeName: "Cara Cancelled",
          attendeeEmail: "cara@example.com",
          qrCode: "EVT-333-CCCCCCCC",
          status: "cancelled",
          checkedIn: false,
          registeredAt: now,
        },
      ],
      isLoading: false,
    };
  });
  mocks.mutate.mockReset().mockResolvedValue({ success: true });
});

describe("AC-005: registration oversight", () => {
  test("AC-005: rows show attendee, event and status", () => {
    render(<AdminRegistrationsPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getAllByText("Tech Summit")).toHaveLength(2);
    expect(screen.getByText("confirmed")).toBeInTheDocument();
    expect(screen.getByText("cancelled")).toBeInTheDocument();
  });

  test("AC-005: a confirmed row offers a cancel action with confirmation", async () => {
    const user = userEvent.setup();
    render(<AdminRegistrationsPage />);

    expect(screen.queryByRole("button", { name: "Cancel Registration" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Cancel Registration" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel Registration" }));

    expect(mocks.mutate).toHaveBeenCalledWith({ registrationId: "reg_ada" });
  });

  test("AC-005: a cancelled row has no cancel action", () => {
    render(<AdminRegistrationsPage />);

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    expect(cancelButtons).toHaveLength(1);
  });
});
