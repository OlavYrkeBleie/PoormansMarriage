import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

// Nordea CSV: ';' delimiter, "Bokføringsdato" / "Beskrivelse" / "Beløp".
export function parseNordeaCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
