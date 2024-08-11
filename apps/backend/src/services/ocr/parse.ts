export interface ParsedReceipt {
  total: number | null;
  date: string | null;
  cardLastFour: string | null;
  merchant: string | null;
}

const TOTAL_LABELS = /\b(?:TOTAL|SUM|TOTALT|BELØP|BELOP|Å\s*BETALE|A\s*BETALE|TO\s*PAY)\b[:\s]*([0-9]{1,6}[.,][0-9]{2})/i;
const FALLBACK_AMOUNT = /([0-9]{1,6})[.,]([0-9]{2})(?!.*[0-9])/;
const DATE_PATTERNS = [
  /\b(\d{4})[-/.](\d{2})[-/.](\d{2})\b/,
  /\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/,
  /\b(\d{2})[-/.](\d{2})[-/.](\d{2})\b/,
];
const CARD_LAST_FOUR = /(?:\*{4,}|x{3,}|X{3,})[\s-]?(\d{4})|\b(\d{4})(?=\s*(?:VISA|MC|MASTERCARD)?\s*$)/m;

export function parseReceipt(text: string): ParsedReceipt {
  const cleaned = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  return {
    total: extractTotal(cleaned),
    date: extractDate(cleaned),
    cardLastFour: extractCardLastFour(cleaned),
    merchant: extractMerchant(cleaned),
  };
}

function extractTotal(text: string): number | null {
  const m = text.match(TOTAL_LABELS);
  if (m?.[1]) return toMinorUnits(m[1]);
  const f = text.match(FALLBACK_AMOUNT);
  if (f) return toMinorUnits(`${f[1]}.${f[2]}`);
  return null;
}

function toMinorUnits(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function extractDate(text: string): string | null {
  for (const p of DATE_PATTERNS) {
    const m = text.match(p);
    if (!m) continue;
    if (p === DATE_PATTERNS[0] && m[1]) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    if (p === DATE_PATTERNS[1] && m[3]) {
      return `${m[3]}-${m[2]}-${m[1]}`;
    }
    if (p === DATE_PATTERNS[2] && m[3]) {
      const yr = parseInt(m[3], 10);
      const full = yr < 70 ? 2000 + yr : 1900 + yr;
      return `${full}-${m[2]}-${m[1]}`;
    }
  }
  return null;
}

function extractCardLastFour(text: string): string | null {
  const m = text.match(CARD_LAST_FOUR);
  return m?.[1] ?? m?.[2] ?? null;
}

function extractMerchant(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const candidate = lines.slice(0, 5).find((l) => /[A-ZÆØÅ]{3,}/.test(l) && !/\d{4}/.test(l));
  return candidate ?? lines[0] ?? null;
}
