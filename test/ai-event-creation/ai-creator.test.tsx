// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  onGenerated: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import AIEventCreator from "@/app/(main)/create-event/_components/ai-event-creator";

const generated = {
  title: "React 19 Meetup",
  description: "A meetup about React 19.",
  category: "tech",
  suggestedCapacity: 50,
  suggestedTicketType: "free",
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mocks.onGenerated.mockReset();
  mocks.toastError.mockReset();
  mocks.toastSuccess.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openAndSubmit(prompt = "A React meetup") {
  const user = userEvent.setup();
  render(<AIEventCreator onEventGenerated={mocks.onGenerated} />);

  await user.click(screen.getAllByRole("button", { name: /generate with ai/i })[0]);
  await user.type(screen.getByPlaceholderText(/tech meetup about react 19/i), prompt);
  await user.click(screen.getByRole("button", { name: /^generate$/i }));
}

describe("AC-001: generating event details", () => {
  test("AC-001: submitting a prompt shows loading and fills the form from the API", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    await openAndSubmit();

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate-event",
      expect.objectContaining({ method: "POST" })
    );

    resolveFetch({ ok: true, json: async () => generated });

    await waitFor(() => expect(mocks.onGenerated).toHaveBeenCalledWith(generated));
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });
});

describe("AC-005: failing safely in the dialog", () => {
  test("AC-005: a server error keeps the dialog open, shows an error toast, and does not populate the form", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Failed to generate event" }),
    });

    await openAndSubmit();

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(screen.getByText("AI Event Creator")).toBeInTheDocument();
    expect(mocks.onGenerated).not.toHaveBeenCalled();
  });

  test("AC-005: a network failure keeps the dialog open and shows an error toast", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await openAndSubmit();

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Failed to generate event. Please try again."
      )
    );
    expect(screen.getByText("AI Event Creator")).toBeInTheDocument();
    expect(mocks.onGenerated).not.toHaveBeenCalled();
  });
});
