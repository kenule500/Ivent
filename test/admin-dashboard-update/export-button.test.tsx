// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: () => mocks.generate,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/convex/_generated/api", () => ({
  api: { exports: { generate: { __apiName: "exports.generate" } } },
}));

import { ExportButton } from "@/components/admin/export-button";

let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.generate.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => undefined);
});

afterEach(() => {
  clickSpy.mockRestore();
});

describe("export trigger", () => {
  test("AC-018: shows progress, rejects repeat clicks, downloads the CSV and toasts the result", async () => {
    const user = userEvent.setup();
    let resolveExport: (value: unknown) => void = () => undefined;
    mocks.generate.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      })
    );

    render(<ExportButton module="users" />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const preparing = screen.getByRole("button", { name: "Preparing…" });
    expect(preparing).toBeDisabled();
    await user.click(preparing);
    expect(mocks.generate).toHaveBeenCalledTimes(1);

    resolveExport({
      ok: true,
      filename: "users-2026-10-20.csv",
      csv: '"Name"\r\n"Ada"\r\n',
      rowCount: 1,
    });

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "1 rows exported to users-2026-10-20.csv"
      )
    );
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled()
    );
  });

  test("AC-018: a refusal or failure names the reason in a toast without exposing a stack trace", async () => {
    const user = userEvent.setup();

    mocks.generate.mockResolvedValueOnce({
      ok: false,
      reason: "too_many_rows",
      message: "This export has 10,001 rows. Narrow the filters to 10,000 rows or fewer.",
    });
    const { unmount } = render(<ExportButton module="users" />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "This export has 10,001 rows. Narrow the filters to 10,000 rows or fewer."
      )
    );
    expect(clickSpy).not.toHaveBeenCalled();
    unmount();

    mocks.toastError.mockReset();
    mocks.generate.mockRejectedValueOnce(new Error("The export failed. Try a narrower filter."));
    render(<ExportButton module="events" />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "The export failed. Try a narrower filter."
      )
    );
    expect(mocks.toastError.mock.calls[0]?.[0]).not.toMatch(/\n\s+at /);
  });
});
