import { cn } from "@/lib/utils";

/**
 * Text alternative for every chart (FR-016, NFR-009).
 * The table is real DOM, so screen readers and keyboard users can reach the
 * same numbers the chart draws.
 */

export interface DataTableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface DataTableRow {
  key: string;
  cells: (string | number)[];
}

interface DataTableAltProps {
  caption: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  className?: string;
}

export function DataTableAlt({ caption, columns, rows, className }: DataTableAltProps) {
  return (
    <figure className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-2 py-1.5 font-medium text-muted-foreground",
                  column.align === "right" && "text-right"
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              {row.cells.map((cell, index) => {
                const column = columns[index];
                const isHeader = index === 0;
                return isHeader ? (
                  <th
                    key={column?.key ?? index}
                    scope="row"
                    className="px-2 py-1.5 font-normal text-foreground"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={column?.key ?? index}
                    className={cn(
                      "px-2 py-1.5 text-muted-foreground",
                      column?.align === "right" && "text-right"
                    )}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
