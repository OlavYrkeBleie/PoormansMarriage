import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

// SpareBank 1 SR-Bank follows Sparebank1 CSV format.
export function parseSrBankCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
