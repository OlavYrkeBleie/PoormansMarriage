import { parse } from "csv-parse/sync";

export interface ParsedBankRow {
  transactionDate: string;
  amount: number;
  rawDescription: string;
  cardLastFour: string | null;
}

const DATE_COLS = ["Dato", "Bokføringsdato", "Bokfort dato", "Rentedato", "Valuteringsdato", "Date", "Transaction Date", "Booking date"];
const DESC_COLS = ["Forklaring", "Beskrivelse", "Tekst", "Description", "Text", "Narrative", "Merchant"];
const AMOUNT_COLS = ["Beløp", "Belop", "Amount", "Transaction Amount", "Sum"];
const DEBIT_COLS  = ["Ut", "Out", "Debit", "Ut av konto", "Belastet"];
const CREDIT_COLS = ["Inn", "In", "Credit", "Inn på konto", "Kreditert"];

export interface GenericAdapterOptions {
  /** Delimiter hint (defaults to auto-detect between ; and ,). */
  delimiter?: string | string[];
}

export function parseGenericNordicCsv(content: string, opts: GenericAdapterOptions = {}): ParsedBankRow[] {
  const delimiter = opts.delimiter ?? pickDelimiter(content);
  const records: Record<string, string>[] = parse(content, {
    columns: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  return records.map(rowToParsed).filter((r): r is ParsedBankRow => !!r);
}

function pickDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes(";")) return ";";
  if (firstLine.includes("\t")) return "\t";
  return ",";
}

function rowToParsed(row: Record<string, string>): ParsedBankRow | null {
  const rawDate = pick(row, DATE_COLS);
  const desc: string = pick(row, DESC_COLS) ?? "";
  if (!rawDate) return null;

  let amt = extractAmount(row);
  if (amt === null) return null;

  const date = normalizeDate(rawDate);
  if (!date) return null;

  return {
    transactionDate: date,
    amount: Math.abs(amt),
    rawDescription: desc,
    cardLastFour: extractCardLastFour(desc),
  };
}

function extractAmount(row: Record<string, string>): number | null {
  const single = pick(row, AMOUNT_COLS);
  if (single) return normalizeAmount(single);

  const debit = pick(row, DEBIT_COLS);
  const credit = pick(row, CREDIT_COLS);
  if (debit) {
    const d = normalizeAmount(debit);
    if (d !== null) return -Math.abs(d);
  }
  if (credit) {
    const c = normalizeAmount(credit);
    if (c !== null) return Math.abs(c);
  }
  return null;
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  const lowered: Record<string, string> = {};
  for (const k of Object.keys(row)) lowered[k.toLowerCase().trim()] = row[k] ?? "";
  for (const k of keys) {
    const v = lowered[k.toLowerCase().trim()];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function normalizeDate(raw: string): string | null {
  const m1 = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return raw;
  const m2 = raw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  const m3 = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;
  return null;
}

function normalizeAmount(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

function extractCardLastFour(desc: string): string | null {
  const m = desc.match(/\*+(\d{4})\b/) ?? desc.match(/\bx+(\d{4})\b/i) ?? desc.match(/\b(\d{4})\b(?=\s*(?:VISA|MC|MASTERCARD))/i);
  return m?.[1] ?? null;
}
