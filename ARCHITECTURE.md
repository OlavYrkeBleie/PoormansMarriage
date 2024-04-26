# Architecture

## Processes

One Node process serves both the API and the built frontend in production. In dev, Vite runs separately and proxies `/api` to the backend.

```
dev:   vite :5173  ──proxy /api──▶  fastify :3000  ──▶  sqlite data/app.sqlite
prod:  fastify :3000 serves both SPA + /api         ──▶  sqlite data/app.sqlite
```

## Data model

See [PLAN.md §4](PLAN.md). Drizzle schema lives in `apps/backend/src/db/schema.ts`.

Key invariants:

- Amounts stored as **integer minor units** (øre / cents). All math integer until render.
- `expenses.split` is a JSON object `{ [user_id]: percentage }` that always sums to 100.
- A `receipts` row is the source of truth for "did this purchase really happen"; a `bank_transactions` row is the source of truth for "did it clear the bank". Reconciliation matches the two.

## OCR pipeline

```
POST /api/receipts          multipart upload
  │
  ▼
save image → data/receipts/<uuid>.jpg
  │
  ▼
enqueue job  (in-process queue; no external broker)
  │
  ▼
tesseract.js worker   lang=nor+eng
  │
  ▼
parse(text) → { date, total, card_last_four, merchant }
  │
  ▼
update receipts row, create draft expense (status=PENDING_REVIEW)
  │
  ▼
frontend polls /api/receipts/:id until status != PENDING
```

## Bank reconciliation

For each imported `bank_transactions` row:

1. Hash `(date, amount, raw_description)` → skip if already imported.
2. Try to auto-match against an unreconciled `expenses` row where
   `|tx.date - exp.occurred_on| ≤ 2 days` AND `tx.amount == exp.amount`
   AND (`tx.card_last_four == card.last_four` OR card is shared).
3. On match → `match_status = AUTO_MATCHED`, link `matched_expense_id`.
4. On no match → stays `UNMATCHED`, shows in `/bank/inbox`.

User actions on unmatched rows:
- **Attach receipt** → manual match to existing expense.
- **Mark "no receipt needed"** → category's `requires_receipt = false` bills (power, insurance).
- **Mark "missing receipt"** → flags cardholder as owing the money (they bought something personal on the shared card and lost the receipt).

## Auth

- `POST /api/auth/register` argon2id-hashes password, inserts user.
- `POST /api/auth/login` verifies, signs a JWT (7-day expiry), sets `httpOnly`, `SameSite=strict`, `Secure` (prod only) cookie named `pm_session`.
- All `/api/*` routes except `/api/auth/*` require a valid cookie.

## Settlement

`POST /api/settlements { period_start, period_end }` runs:

```
for each expense in period where not excluded:
  for each user in split:
    owed[user] += amount * split[user] / 100
    paid[user_who_paid] += amount
net[user] = paid[user] - owed[user]
```

The one user with negative `net` pays the one with positive `net`. Creates a `settlements` row in `PENDING`; user confirms transfer externally then clicks "Mark settled".
