import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

// DNB CSV export: ';' delimiter, columns Dato / Forklaring / Beløp ut / Beløp inn.
export function parseDnbCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
