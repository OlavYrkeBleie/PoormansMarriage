import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

export function parseFanaSparebankCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
