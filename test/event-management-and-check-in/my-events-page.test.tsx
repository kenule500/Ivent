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

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
  useConvexMutation: () => ({ mutate: mocks.mutate, isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: { events: { getMyEvents: { __apiName: "events.getMyEvents" }, deleteEvent: {} } },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/components/event-card", () => ({
  default: ({
    event,
    onDelete,
  }: {
    event: { _id: string; title: string };
    onDelete?: (id: string) => void;
  }) => (
    <div>
      <span>{event.title}</span>
      <button onClick={() => onDelete?.(event._id)}>Delete event</button>
    </div>
  ),
}));

import MyEventsPage from "@/app/(main)/my-events/page";

beforeEach(() => {
  mocks.useConvexQuery.mockReset().mockReturnValue({
    data: [{ _id: "event_1", title: "My Summit" }],
    isLoading: false,
  });
  mocks.mutate.mockReset().mockResolvedValue({ success: true });
  vi.spyOn(window, "confirm").mockReset();
});

describe("AC-005: deleting an event requires confirmation", () => {
  test("AC-005: cancelling the confirm dialog does not delete anything", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<MyEventsPage />);
    await user.click(screen.getByRole("button", { name: "Delete event" }));

    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  test("AC-005: confirming deletes the event", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(true);

    render(<MyEventsPage />);
    await user.click(screen.getByRole("button", { name: "Delete event" }));

    expect(mocks.mutate).toHaveBeenCalledWith({ eventId: "event_1" });
  });
});
