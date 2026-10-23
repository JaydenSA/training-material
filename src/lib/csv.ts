/** Quote cells and neutralise spreadsheet formulas, including user-entered names. */
export function createCsv(headers: string[], rows: string[][]) {
  const quote = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
  return `${headers.join(",")}\n${rows.map((row) => row.map(quote).join(",")).join("\n")}`;
}
export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
