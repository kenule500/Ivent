// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  onComplete: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: () => mocks.mutate }));
vi.mock("@/convex/_generated/api", () => ({
  api: { users: { completeOnboarding: { __apiName: "users.completeOnboarding" } } },
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import OnboardingModal from "@/components/onboarding-modal";

beforeEach(() => {
  mocks.mutate.mockReset().mockResolvedValue("user_1");
  mocks.onComplete.mockReset();
  mocks.toastError.mockReset();
  mocks.toastSuccess.mockReset();
});

describe("AC-012: attendee onboarding modal", () => {
  test("AC-012: fewer than three interests blocks progress", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal isOpen onClose={vi.fn()} onComplete={mocks.onComplete} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mocks.toastError).toHaveBeenCalledWith("Please select at least 3 interests");
    expect(screen.getByText("What interests you?")).toBeInTheDocument();
  });

  test("AC-012: three interests advance to the state/city step and location is required", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal isOpen onClose={vi.fn()} onComplete={mocks.onComplete} />);

    await user.click(screen.getByRole("button", { name: /technology/i }));
    await user.click(screen.getByRole("button", { name: /music/i }));
    await user.click(screen.getByRole("button", { name: /sports/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Where are you located?")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /complete setup/i }));

    expect(mocks.toastError).toHaveBeenCalledWith("Please select both state and city");
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
