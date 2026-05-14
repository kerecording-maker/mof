export type SheetMatrix = unknown[][];

export type ParsedWorkbook = {
  fileName: string;
  sheets: { name: string; rows: SheetMatrix }[];
};

export async function parseExcelWorkbook(file: File): Promise<ParsedWorkbook> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    if (!ws) return { name, rows: [] as SheetMatrix };
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as SheetMatrix;
    return { name, rows };
  });
  return { fileName: file.name, sheets };
}

export function getSheetMatrix(wb: ParsedWorkbook, sheetName: string): SheetMatrix {
  return wb.sheets.find((s) => s.name === sheetName)?.rows ?? [];
}

export function headerRow(matrix: SheetMatrix): string[] {
  if (!matrix.length) return [];
  return matrix[0].map((c) => String(c).trim());
}

export function findColumnByKeywords(headers: string[], keywords: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (let i = 0; i < lower.length; i++) {
    if (keywords.some((kw) => lower[i].includes(kw))) return i;
  }
  return -1;
}

export function columnNumericValues(
  matrix: SheetMatrix,
  colIndex: number,
  skipHeader = true,
): number[] {
  if (colIndex < 0) return [];
  const start = skipHeader ? 1 : 0;
  const out: number[] = [];
  for (let r = start; r < matrix.length; r++) {
    const v = matrix[r][colIndex];
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    out.push(n);
  }
  return out;
}

export function columnStringValues(
  matrix: SheetMatrix,
  colIndex: number,
  skipHeader = true,
): string[] {
  if (colIndex < 0) return [];
  const start = skipHeader ? 1 : 0;
  const out: string[] = [];
  for (let r = start; r < matrix.length; r++) {
    out.push(String(matrix[r][colIndex] ?? "").trim() || `Row ${r}`);
  }
  return out;
}
