// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, test } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelErrorBoundary } from "@/components/admin/panel-state";

describe("health panels", () => {
  test("AC-032: one failing panel shows a local retry state while the rest of the page keeps rendering", async () => {
    const boundary = React.createRef<PanelErrorBoundary>();

    render(
      <div>
        <PanelErrorBoundary ref={boundary} label="Email delivery">
          <p>Email delivery is healthy</p>
        </PanelErrorBoundary>
        <section aria-label="Cron jobs">
          <h2>Cron jobs</h2>
          <p>Daily digest ran successfully.</p>
        </section>
      </div>
    );

    // Simulate the error-boundary state React enters when the email query throws.
    act(() => {
      boundary.current?.setState({ hasError: true });
    });

    expect(
      screen.getByText("Email delivery could not load. Other panels are unaffected.")
    ).toBeInTheDocument();
    // The sibling panel is still on screen and unchanged.
    expect(screen.getByText("Daily digest ran successfully.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Email delivery is healthy")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(screen.getByText("Email delivery is healthy")).toBeInTheDocument();
    expect(
      screen.queryByText("Email delivery could not load. Other panels are unaffected.")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Daily digest ran successfully.")).toBeInTheDocument();
  });
});
