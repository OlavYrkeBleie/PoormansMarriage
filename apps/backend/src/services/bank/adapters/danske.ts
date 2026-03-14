import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

// Danske Bank export: ',' delimiter, "Date" / "Text" / "Amount".
export function parseDanskeCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: "," });
}
