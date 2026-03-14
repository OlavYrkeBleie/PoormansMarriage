import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

// Sbanken (formerly Skandiabanken, now part of DNB): ',' delimiter,
// "Transaction Date" / "Text" / "Amount".
export function parseSbankenCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: "," });
}
