import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";
export type { ParsedBankRow } from "./generic.js";

export function parseSparebank1Csv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
