// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  mutate: vi.fn(),
  useConvexQuery: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ has: () => false }),
  PricingTable: () => <div data-testid="pricing-table" />,
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
  useConvexMutation: () => ({ mutate: mocks.mutate, isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    users: { getCurrentUser: { __apiName: "users.getCurrentUser" } },
    events: { createEvent: { __apiName: "events.createEvent" } },
  },
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/components/ImagePicker", () => ({ default: () => null }));
vi.mock("@/components/SmartImage", () => ({
  SmartImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock("@/components/upgrade-modal", () => ({ default: () => null }));

import CreateEventPage from "@/app/(main)/create-event/page";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mocks.mutate.mockReset().mockResolvedValue("event_1");
  mocks.useConvexQuery.mockReturnValue({
    data: { freeEventsCreated: 0 },
    isLoading: false,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AC-004: review before saving", () => {
  test("AC-004: generated values only populate the form and no event is created until submit", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Generated Summit",
        description: "A generated description for the summit.",
        category: "tech",
        suggestedCapacity: 75,
        suggestedTicketType: "free",
      }),
    });

    render(<CreateEventPage />);

    await user.click(screen.getAllByRole("button", { name: /generate with ai/i })[0]);
    await user.type(screen.getByPlaceholderText(/tech meetup about react 19/i), "A summit");
    await user.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Event Name")).toHaveValue("Generated Summit")
    );
    expect(screen.getByPlaceholderText(/ex: 100/i)).toHaveValue(75);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
