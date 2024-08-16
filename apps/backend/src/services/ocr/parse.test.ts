import { describe, it, expect } from "vitest";
import { parseReceipt } from "./parse.js";

describe("parseReceipt", () => {
  it("extracts Norwegian total with komma decimals", () => {
    const text = "REMA 1000 HAUGESUND\n2024-03-15\nBrød 24,90\nMelk 19,50\nTOTAL: 44,40\nVISA ****1234";
    const r = parseReceipt(text);
    expect(r.total).toBe(4440);
  });

  it("extracts date from DD.MM.YYYY", () => {
    const r = parseReceipt("KIWI\n15.03.2024\nTotal: 100,00");
    expect(r.date).toBe("2024-03-15");
  });

  it("finds the card last four", () => {
    const r = parseReceipt("Betalt med VISA ****5678");
    expect(r.cardLastFour).toBe("5678");
  });

  it("guesses the merchant from the first loud line", () => {
    const r = parseReceipt("REMA 1000\nHauge\n2024-01-01\nSum 50,00");
    expect(r.merchant).toBe("REMA 1000");
  });
});
