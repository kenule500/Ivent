/**
 * CSV serialization for admin exports (FR-019, NFR-013).
 *
 * Follows OWASP CSV-injection guidance:
 *  - every field is wrapped in double quotes;
 *  - internal quotes are doubled;
 *  - a value starting with =, +, -, @, tab, CR, or LF is prefixed with a tab.
 *
 * The leading-tab prefix keeps the value readable while stopping Excel and
 * Sheets from evaluating it as a formula.
 */

export const MAX_EXPORT_ROWS = 10_000;

const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r", "\n"];

export interface CsvColumn<T> {
  /** Stable key used for filenames and diagnostics. */
  key: string;
  /** Header text shown in the first row. */
  header: string;
  /** Extracts a printable value from the row. */
  value: (row: T) => unknown;
}

/** Neutralise a value that a spreadsheet could interpret as a formula. */
export function neutralizeCell(value: string) {
  if (!value) return value;
  const first = value.charAt(0);
  if (DANGEROUS_PREFIXES.includes(first)) return `\t${value}`;
  return value;
}

/** Quote a single field, doubling any internal quote, then neutralise it. */
export function escapeCsvField(value: unknown) {
  if (value === null || value === undefined) return '""';

  const raw = value instanceof Date ? value.toISOString() : String(value);
  const neutralized = neutralizeCell(raw);
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Serialize rows to CSV text.
 * A header-only document is returned when `rows` is empty.
 */
export function serializeCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]) {
  if (columns.length === 0) {
    throw new Error("An export needs at least one column");
  }

  const header = columns.map((column) => escapeCsvField(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvField(column.value(row))).join(",")
  );

  // Trailing newline keeps the file POSIX-friendly for downstream tools.
  return [header, ...body].join("\r\n") + "\r\n";
}

/** `<module>-<yyyy-MM-dd>.csv` using an already-computed date stamp. */
export function csvFilename(module: string, dateStamp: string) {
  const safeModule = module.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return `${safeModule}-${dateStamp}.csv`;
}

export interface ExportRequest<T> {
  module: string;
  rows: readonly T[];
  columns: readonly CsvColumn<T>[];
  dateStamp: string;
  /** Defaults to MAX_EXPORT_ROWS. */
  maxRows?: number;
}

export type ExportResult =
  | { ok: true; filename: string; csv: string; rowCount: number }
  | { ok: false; reason: "empty" | "too_many_rows"; rowCount: number; cap: number };

/** Build an export, refusing empty and over-cap requests. */
export function buildCsvExport<T>({
  module,
  rows,
  columns,
  dateStamp,
  maxRows = MAX_EXPORT_ROWS,
}: ExportRequest<T>): ExportResult {
  if (rows.length === 0) {
    return { ok: false, reason: "empty", rowCount: 0, cap: maxRows };
  }

  if (rows.length > maxRows) {
    return { ok: false, reason: "too_many_rows", rowCount: rows.length, cap: maxRows };
  }

  return {
    ok: true,
    filename: csvFilename(module, dateStamp),
    csv: serializeCsv(rows, columns),
    rowCount: rows.length,
  };
}
