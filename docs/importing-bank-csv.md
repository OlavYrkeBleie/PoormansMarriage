# Importing your bank CSV

The app ships with adapters for three Norwegian banks. The Sparebank1 adapter is the reference; DNB and Nordea delegate to it because their CSV schemas overlap heavily.

## Expected columns

| Header candidates (case-insensitive) | Meaning |
|---|---|
| `Dato`, `Bokføringsdato`, `Date`, `Transaction Date` | Transaction date |
| `Beløp`, `Belop`, `Amount`, `Ut`, `Inn` | Amount (sign is discarded; magnitude is stored) |
| `Forklaring`, `Beskrivelse`, `Description`, `Text`, `Tekst` | Raw description (this is what gets scanned for card last-four) |

Delimiter: `;` or `,`. BOM is handled. Quoted strings are handled.

## Dedup

Every row hashes `(date, amount, description)` with SHA-256. Re-importing the same file (or an overlapping file) will skip duplicates, so you can safely pull a full statement every month without worrying about overlap with last month's.

## What happens after import

1. Row is inserted as `UNMATCHED`.
2. The reconciler looks for an unreconciled expense with the same amount, within ±2 days of the bank date, and same card last-four.
3. On a hit: `AUTO_MATCHED`, expense is marked reconciled.
4. On a miss: row shows up in `/bank` under **Unmatched**.

## Adding a new bank

Create `apps/backend/src/services/bank/adapters/<name>.ts` exporting a function `parse<Name>Csv(content: string): ParsedBankRow[]`. If your bank's CSV is remotely sane, delegating to `parseSparebank1Csv` is enough. Register it in `apps/backend/src/routes/bank.ts` → `adapterFor()`.
