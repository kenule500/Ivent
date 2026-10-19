// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
vi.mock("@/components/upgrade-modal", () => ({
  default: ({ isOpen, trigger }: { isOpen: boolean; trigger: string }) =>
    isOpen ? <div data-testid="upgrade-modal">{trigger}</div> : null,
}));

import CreateEventPage from "@/app/(main)/create-event/page";

beforeEach(() => {
  mocks.mutate.mockReset().mockResolvedValue("event_1");
  mocks.useConvexQuery.mockReset().mockReturnValue({
    data: { freeEventsCreated: 0 },
    isLoading: false,
  });
  mocks.toastError.mockReset();
});

function timeInputs() {
  return Array.from(document.querySelectorAll('input[type="time"]')) as HTMLInputElement[];
}

describe("AC-001: create-event validation", () => {
  test("AC-001: required fields are enforced", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage />);

    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(await screen.findByText("Title must be at least 5 characters")).toBeInTheDocument();
    expect(screen.getByText("Description must be at least 20 characters")).toBeInTheDocument();
    expect(screen.getByText("Please select a category")).toBeInTheDocument();
    // The city field is enforced by the schema but renders no inline message.
    expect(screen.getByText("Start date is required")).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  test("AC-001: short values, zero capacity and a non-URL venue are rejected", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateEventPage />);

    await user.type(screen.getByPlaceholderText("Event Name"), "abc");
    await user.type(screen.getByPlaceholderText(/tell people about your event/i), "short");

    const capacity = screen.getByPlaceholderText(/ex: 100/i);
    await user.clear(capacity);
    await user.type(capacity, "0");

    const [, endTime] = timeInputs();
    fireEvent.change(endTime, { target: { value: "9:0" } });

    await user.type(screen.getByPlaceholderText(/venue link/i), "not-a-url");

    // Submit the form directly so the browser's native constraint validation
    // does not short-circuit the React/Zod validation under test.
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(await screen.findByText("Capacity must be at least 1")).toBeInTheDocument();
    expect(screen.getByText("Must be a valid URL")).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});

describe("AC-003: Pro gating in the form", () => {
  test("AC-003: a free account is prompted to upgrade for a custom theme colour", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage />);

    await user.click(screen.getByTitle("Unlock more colors with Pro"));

    expect(screen.getByTestId("upgrade-modal")).toHaveTextContent("color");
  });
});
