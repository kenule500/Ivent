// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartCard } from "@/components/admin/chart-card";

const table = {
  caption: "Registrations by day",
  columns: [
    { key: "day", label: "Day" },
    { key: "count", label: "Registrations", align: "right" as const },
  ],
  rows: [
    { key: "2026-10-18", cells: ["2026-10-18", 12] },
    { key: "2026-10-19", cells: ["2026-10-19", 18] },
  ],
};

describe("chart card", () => {
  test("AC-015: title, interpretation, loading, empty and a keyboard-reachable data table with the same numbers", () => {
    const { rerender } = render(
      <ChartCard
        title="Registrations over time"
        description="Daily registrations in the platform timezone."
        table={table}
      >
        <p>Chart canvas</p>
      </ChartCard>
    );

    expect(screen.getByText("Registrations over time")).toBeInTheDocument();
    expect(
      screen.getByText("Daily registrations in the platform timezone.")
    ).toBeInTheDocument();
    expect(screen.getByText("Chart canvas")).toBeInTheDocument();

    // <details>/<summary> is the native keyboard-reachable disclosure control.
    expect(screen.getByText("View data table")).toBeInTheDocument();
    const dataTable = screen.getByRole("table", { name: "Registrations by day" });
    expect(dataTable).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Day" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "12" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "18" })).toBeInTheDocument();

    rerender(
      <ChartCard
        title="Registrations over time"
        description="Daily registrations in the platform timezone."
        loading
        table={table}
      >
        <p>Chart canvas</p>
      </ChartCard>
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("Chart canvas")).not.toBeInTheDocument();
    expect(screen.queryByText("View data table")).not.toBeInTheDocument();

    rerender(
      <ChartCard
        title="Registrations over time"
        description="Daily registrations in the platform timezone."
        empty
        emptyMessage="No registrations in this window."
        table={table}
      >
        <p>Chart canvas</p>
      </ChartCard>
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("No registrations in this window.")).toBeInTheDocument();
    expect(screen.queryByText("Chart canvas")).not.toBeInTheDocument();
    expect(screen.queryByText("View data table")).not.toBeInTheDocument();
  });
});
