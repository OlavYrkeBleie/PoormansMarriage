import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

export function parseStorebrandCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
