/** Matches ANSI color codes, so they can be ignored when measuring width. */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

/** Visible width of a cell, ignoring color codes. */
export function visibleLength(text: string): number {
  return text.replace(ANSI_PATTERN, "").length;
}

function pad(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleLength(text)));
}

/**
 * Renders a plain-text table with box-drawing-free ASCII borders, so it looks
 * the same in PowerShell, cmd, Terminal, and any CI log.
 */
export function renderTable(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const widths = headers.map((header, column) =>
    Math.max(visibleLength(header), ...rows.map((row) => visibleLength(row[column] ?? ""))),
  );
  const line = (cells: readonly string[]): string =>
    "| " + widths.map((width, column) => pad(cells[column] ?? "", width)).join(" | ") + " |";
  const divider = "+-" + widths.map((width) => "-".repeat(width)).join("-+-") + "-+";

  return [divider, line(headers), divider, ...rows.map(line), divider].join("\n");
}
