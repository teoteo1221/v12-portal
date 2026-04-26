/**
 * Parser CSV mínimo sin dependencias.
 * Maneja:
 *   - Campos con comas entre comillas dobles: "Hola, mundo"
 *   - Comillas escapadas dentro de un campo: "Dijo ""hola"""
 *   - Separadores: coma (,) o punto y coma (;) — auto-detectado
 *   - Line endings: \n, \r\n
 *   - BOM al inicio
 */

export type CsvRow = Record<string, string>;

export function parseCSV(text: string): { headers: string[]; rows: CsvRow[]; delimiter: string } {
  // Remove BOM if present
  let input = text.replace(/^\uFEFF/, "");

  // Auto-detect delimiter by looking at the first line
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const delimiter =
    tabs > commas && tabs > semicolons ? "\t" : semicolons > commas ? ";" : ",";

  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i += 1;
          continue;
        }
      } else {
        field += ch;
        i += 1;
        continue;
      }
    }

    // not in quotes
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  // Remove fully empty trailing rows
  while (records.length > 0) {
    const last = records[records.length - 1];
    if (last.every((v) => v.trim() === "")) records.pop();
    else break;
  }

  if (records.length === 0) {
    return { headers: [], rows: [], delimiter };
  }

  const headers = records[0].map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const raw = records[r];
    const obj: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (raw[c] ?? "").trim();
    }
    rows.push(obj);
  }
  return { headers, rows, delimiter };
}

/** Normalize a header to match column keys: lowercase, strip accents, spaces → underscore */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Parse a string to int, returns 0 if empty or invalid (clamped to >= 0) */
export function toInt(v: string | undefined | null): number {
  if (v === undefined || v === null || v === "") return 0;
  const cleaned = String(v).replace(/[^\d\-.]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** Parse a date string in multiple formats → YYYY-MM-DD. Returns null if unparseable. */
export function toISODate(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  // Already YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/;
  const mIso = s.match(iso);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;

  // DD/MM/YYYY or D/M/YY
  const dm = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const m = s.match(dm);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yy = m[3];
    if (yy.length === 2) yy = (Number(yy) > 50 ? "19" : "20") + yy;
    return `${yy}-${mm}-${dd}`;
  }

  // Fallback: try Date.parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}
