import type { ParsedBankRow } from "./adapters/generic.js";
import { parseGenericNordicCsv } from "./adapters/generic.js";
import { parseSparebank1Csv } from "./adapters/sparebank1.js";
import { parseDnbCsv } from "./adapters/dnb.js";
import { parseNordeaCsv } from "./adapters/nordea.js";
import { parseHandelsbankenCsv } from "./adapters/handelsbanken.js";
import { parseStorebrandCsv } from "./adapters/storebrand.js";
import { parseDanskeCsv } from "./adapters/danske.js";
import { parseSbankenCsv } from "./adapters/sbanken.js";
import { parseSrBankCsv } from "./adapters/sr-bank.js";
import { parseFanaSparebankCsv } from "./adapters/fana-sparebank.js";

export interface BankDescriptor {
  id: string;
  label: string;
  parse: (csv: string) => ParsedBankRow[];
}

/**
 * Ordered list of supported banks. The first entries are what the UI shows
 * at the top of the dropdown. Add new adapters at the top of the array.
 */
export const BANKS: BankDescriptor[] = [
  { id: "sparebank1",    label: "SpareBank 1",           parse: parseSparebank1Csv },
  { id: "dnb",           label: "DNB",                   parse: parseDnbCsv },
  { id: "nordea",        label: "Nordea",                parse: parseNordeaCsv },
  { id: "handelsbanken", label: "Handelsbanken",         parse: parseHandelsbankenCsv },
  { id: "sbanken",       label: "Sbanken (Skandiabanken)", parse: parseSbankenCsv },
  { id: "danske",        label: "Danske Bank",           parse: parseDanskeCsv },
  { id: "storebrand",    label: "Storebrand",            parse: parseStorebrandCsv },
  { id: "sr-bank",       label: "SpareBank 1 SR-Bank",   parse: parseSrBankCsv },
  { id: "fana",          label: "Fana Sparebank",        parse: parseFanaSparebankCsv },
  { id: "generic",       label: "Other (generic Nordic CSV)", parse: (c) => parseGenericNordicCsv(c) },
];

export function adapterFor(id: string): BankDescriptor["parse"] {
  return BANKS.find((b) => b.id === id)?.parse ?? parseSparebank1Csv;
}
