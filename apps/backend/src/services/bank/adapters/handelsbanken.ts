import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";

export function parseHandelsbankenCsv(content: string): ParsedBankRow[] {
  return parseGenericNordicCsv(content, { delimiter: ";" });
}
