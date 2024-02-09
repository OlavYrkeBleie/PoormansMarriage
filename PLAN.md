# Shared Household Expense Tracker — Project Plan

**License:** MIT
**Status:** Planning / Pre-development
**Repository:** (TBD on GitHub)

---

## 1. Project Purpose

A clean, self-hostable web application for two (or more) people who share living expenses — typically partners moving into a house together — to track, split, and reconcile shared bills automatically.

The app ingests:
- **Recurring fixed bills** (power, water, gas, garbage, internet, insurance, etc.) — usually paid via digital invoice (EHF in Norway, direct debit, etc.)
- **Receipts from a shared card** — logged by scanning the receipt with a phone
- **Receipts paid with a personal card** — logged the same way but flagged as "owed back"
- **Bank transactions** (imported quarterly or monthly) — used to cross-check receipts and catch missing ones

It produces:
- A running ledger of who owes whom
- Category breakdowns (Fixed / Maintenance / Daily, each split 50/50 by default but configurable)
- A monthly/quarterly reconciliation view
- Exportable reports

**Design goals (non-negotiable):**
1. Clean, modern UI — **zero resemblance to a spreadsheet** by default, with an optional table view
2. Easy for non-coders to install and run
3. MIT licensed, code lives on GitHub, documented well enough to be a portfolio piece
4. Phone-first receipt capture (iOS Shortcut / PWA "Add to Home Screen")
5. No reliance on Google Sheets, Excel, or any proprietary cloud backend

---

## 2. What This Is NOT

To prevent scope creep:

- **Not Splitwise.** Splitwise is transaction-log focused. This app is reconciliation-focused: it assumes a primary shared card and treats deviations as exceptions.
- **Not accounting software.** No double-entry bookkeeping, no tax reporting.
- **Not a Google Sheets plugin.** Google Sheets was the mental starting point, but the final product is a standalone web app. (An optional CSV export is included so users *can* open data in Sheets/Excel if they want.)
- **Not multi-tenant SaaS.** Each household runs their own instance. No user signup flow for strangers.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (PWA)                                              │
│  - React + Vite + TypeScript                                 │
│  - Tailwind CSS + shadcn/ui                                  │
│  - Installable to iOS/Android home screen                    │
│  - Camera access for receipt capture                         │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST / JSON
┌────────────────────────▼─────────────────────────────────────┐
│  BACKEND (single binary / single process)                    │
│  - Node.js + Fastify  (OR  Python + FastAPI — decide in §5)  │
│  - Handles auth, business logic, OCR pipeline                │
│  - Serves the frontend as static files                       │
└────────────────────────┬─────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬──────────────────┐
        ▼                ▼                ▼                  ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  SQLite DB   │  │ Receipt     │  │ OCR engine   │  │ Bank CSV     │
│  (one file)  │  │ image store │  │ (Tesseract)  │  │ importer     │
│              │  │ (disk)      │  │              │  │              │
└──────────────┘  └─────────────┘  └──────────────┘  └──────────────┘
```

**Key architectural decisions:**

| Concern | Choice | Why |
|---|---|---|
| Storage | SQLite, single file | Zero setup, trivial backup (copy one file), good enough for two users |
| Auth | Local username + password, JWT tokens | No OAuth dependency; runs offline |
| OCR | Tesseract.js (runs on server) | Free, no API keys, works offline |
| Hosting | Runs on any machine: Raspberry Pi, NAS, old laptop, cheap VPS, or localhost only | User's choice |
| Receipt images | Stored on disk in a `receipts/` folder, referenced by DB | Easy to back up, no blob bloat in DB |
| Frontend delivery | Built to static files, served by the backend | One-process deployment |

---

## 4. Core Data Model

Below is the conceptual schema. Tables, columns, and relationships — no SQL syntax.

### 4.1 `users`
- `id`
- `display_name` — e.g. "Alex", "Sam"
- `password_hash`
- `created_at`

*Typically 2 rows. The app supports 3+ but the default UI assumes 2.*

### 4.2 `cards`
- `id`
- `owner_user_id` — nullable; a NULL owner = the shared card
- `label` — free text, e.g. "Joint Sparebank1 Visa"
- `last_four` — last 4 digits/characters (whatever appears on the receipt)
- `is_shared` — boolean; if true, expenses on this card default to 50/50 split
- `created_at`

*The app identifies cards on receipts by matching `last_four`. The user registers each known card once.*

### 4.3 `categories`
- `id`
- `name` — e.g. "Power & Electricity", "Water", "Groceries"
- `group` — one of: `FIXED`, `MAINTENANCE`, `DAILY`, `OTHER`
- `default_split` — JSON, e.g. `{ "user_1": 50, "user_2": 50 }`
- `requires_receipt` — boolean; false for things like power bills that only come as digital invoices
- `icon` — emoji or icon key for the UI
- `color` — hex

*Seeded with sensible defaults. Users can add/edit/delete.*

### 4.4 `merchants` (learned category mapping)
- `id`
- `name_pattern` — string or regex, e.g. "HAUGALAND KRAFT", "REMA 1000"
- `default_category_id` — where transactions from this merchant go automatically
- `learned_from_user_id` — who taught the system this mapping
- `created_at`

*This is the feature: the first time a transaction from "Haugaland Kraft" shows up uncategorized, the user assigns it to "Power & Electricity" and checks "remember this". From then on, the system auto-categorizes all matching entries.*

### 4.5 `expenses` (the central ledger table)
- `id`
- `occurred_on` — date of the actual purchase/bill (from receipt or bank statement)
- `amount` — in minor units (øre/cents) to avoid floating point
- `currency` — default NOK, configurable
- `merchant_name` — raw text from receipt or bank statement
- `category_id` — nullable; NULL = uncategorized (needs user review)
- `card_id` — nullable; which card was used
- `paid_by_user_id` — who actually paid (derived from card owner, or manually set)
- `split` — JSON, e.g. `{ "user_1": 50, "user_2": 50 }`, defaults to category's split
- `source` — enum: `RECEIPT_SCAN`, `BANK_IMPORT`, `MANUAL`, `RECURRING_BILL`
- `receipt_id` — nullable FK to receipts table
- `bank_transaction_id` — nullable FK to bank_transactions table
- `notes` — free text
- `is_reconciled` — boolean; true when a bank transaction has been matched to a receipt (or marked as not requiring one)
- `excluded` — boolean; user can exclude personal expenses that slipped onto the shared card (e.g. "this was my gift to Mom, ignore it")
- `created_at`
- `updated_at`

### 4.6 `receipts`
- `id`
- `image_path` — path on disk
- `uploaded_by_user_id`
- `uploaded_at`
- `ocr_text` — full OCR output
- `ocr_confidence` — 0-1
- `parsed_total` — what the OCR thinks the total was
- `parsed_date` — what the OCR thinks the date was
- `parsed_card_last_four`
- `parsed_merchant`
- `status` — enum: `PENDING_REVIEW`, `CONFIRMED`, `REJECTED`

*Receipts are kept forever (unless the user deletes them). They are the source of truth that bank transactions get reconciled against.*

### 4.7 `bank_transactions`
- `id`
- `imported_from` — filename of the CSV batch
- `imported_at`
- `transaction_date`
- `amount`
- `raw_description` — the gross text from the bank ("VISA 1234 REMA 1000 HAUGESUND")
- `card_last_four` — parsed from description
- `matched_expense_id` — nullable; set when reconciled to a receipt
- `match_status` — enum: `UNMATCHED`, `AUTO_MATCHED`, `MANUAL_MATCHED`, `NO_RECEIPT_REQUIRED`, `MISSING_RECEIPT`

### 4.8 `recurring_bills` (the "fixed expenses" definition)
- `id`
- `name` — "Haugaland Kraft - Strøm"
- `category_id`
- `expected_amount` — approximate; used for sanity-check warnings
- `cadence` — enum: `MONTHLY`, `QUARTERLY`, `ANNUAL`
- `split` — JSON override
- `next_expected_date`
- `active` — boolean

*When a matching bank transaction or invoice arrives, it's auto-linked.*

### 4.9 `settlements`
- `id`
- `period_start`
- `period_end`
- `from_user_id`
- `to_user_id`
- `amount`
- `status` — enum: `PENDING`, `SETTLED`
- `settled_at`
- `notes`

*Generated on demand when the user clicks "Settle up for October".*

---

## 5. Technology Stack — Final Choice

Pick one row from this table and commit. Changing later is expensive.

| Layer | Option A (Recommended) | Option B |
|---|---|---|
| **Backend language** | **TypeScript (Node.js 20+)** | Python 3.11+ |
| **Backend framework** | **Fastify** | FastAPI |
| **ORM** | **Drizzle** | SQLAlchemy |
| **Database** | **SQLite** (via better-sqlite3) | SQLite (via sqlite3) |
| **OCR** | **Tesseract.js** | pytesseract (wraps Tesseract) |
| **Frontend** | **React + Vite + TypeScript** | same |
| **UI components** | **shadcn/ui + Tailwind CSS** | same |
| **Auth** | **Lucia Auth or hand-rolled JWT** | python-jose + passlib |
| **Build/run** | **Single `npm run build` → one Node process** | uvicorn + static files |
| **Packaging** | **Docker image + docker-compose.yml** | same |

**Recommendation: Option A (TypeScript everywhere).**
Reasons:
1. One language across frontend and backend — easier for a solo maintainer.
2. Tesseract.js bundles the OCR engine; no system-level dependency install required by the end user.
3. `npm install && npm start` is the single setup command non-coders understand.

---

## 6. Feature Breakdown — Phase by Phase

Build in this order. Do not start a phase until the previous one works end-to-end.

### Phase 1 — Foundation (Week 1–2)
- [ ] Repo scaffolding, MIT license, README skeleton
- [ ] Database schema + migrations
- [ ] User registration (local, no email), login, session
- [ ] Basic shell UI: sidebar nav, dashboard placeholder, dark/light theme
- [ ] Seed default categories on first run
- [ ] Docker + docker-compose setup
- [ ] CI: lint + typecheck on every push

**Done when:** Two users can register on a fresh install, log in, see an empty dashboard.

### Phase 2 — Manual Expense Entry (Week 2–3)
- [ ] Add expense form: amount, date, category, who paid, split
- [ ] Expense list view with filters (date range, category, user)
- [ ] Edit / delete expense
- [ ] "Who owes whom right now" summary on dashboard

**Done when:** Users can manually enter expenses and see a live running balance.

### Phase 3 — Card Management (Week 3)
- [ ] Card CRUD UI
- [ ] Assign last-4 to each card
- [ ] Mark shared vs. personal cards
- [ ] When entering an expense, selecting the card auto-fills "paid by" and default split

**Done when:** All users' cards are registered and expenses can reference them.

### Phase 4 — Receipt Capture & OCR (Week 4–5)
- [ ] Mobile-friendly upload page (`/upload`)
- [ ] Camera capture via `<input type="file" accept="image/*" capture="environment">`
- [ ] Server-side OCR pipeline (Tesseract.js worker)
- [ ] OCR parser: extract date, total, card last-4, merchant name
- [ ] Norwegian + English language support for Tesseract (`nor+eng`)
- [ ] Review screen: OCR produced draft expense → user confirms or edits → saves
- [ ] iOS Shortcut instructions in README (pre-authenticated "Add Receipt" shortcut)

**Done when:** Snapping a receipt on iPhone → tapping home-screen shortcut → 2 taps to confirm → expense is in ledger.

### Phase 5 — Bank CSV Import & Reconciliation (Week 5–6)
- [ ] CSV upload page, supports common Norwegian bank export formats (DNB, Sparebank1, Nordea — start with one, add more via adapters)
- [ ] Parse transactions, dedupe on `(date, amount, description)` hash
- [ ] Auto-match transactions to existing expenses when date + amount + card match
- [ ] Unmatched bank transactions show up in an "Inbox"
- [ ] For each unmatched: user can (a) attach a receipt, (b) mark "no receipt needed" (for invoices), (c) mark "missing receipt → owed by cardholder"

**Done when:** After importing a CSV, all transactions are categorized or visibly flagged.

### Phase 6 — Category Learning (Week 6)
- [ ] When user categorizes a merchant for the first time, prompt: "Apply to all future transactions from 'Haugaland Kraft'?"
- [ ] On yes: create a `merchants` row
- [ ] Future imports auto-categorize based on merchant name matching
- [ ] Settings page to view / edit / delete learned mappings

**Done when:** Re-importing a second CSV auto-categorizes 80%+ of recurring transactions.

### Phase 7 — Recurring Bills & Invoice Exemption (Week 7)
- [ ] Recurring bills CRUD
- [ ] Expected-bill calendar on dashboard ("Power bill expected in 3 days, ~1200 kr")
- [ ] Mark categories as `requires_receipt: false` — these bypass the receipt check during reconciliation

**Done when:** Digital invoices (EHF / direct debit) don't falsely show as "missing receipt".

### Phase 8 — Settlement & Reports (Week 8)
- [ ] "Settle up" flow: pick period → calculate net owed → mark as paid
- [ ] Monthly summary page with charts (category breakdown, trend over time)
- [ ] CSV export of any date range
- [ ] PDF export of monthly statement (optional, nice-to-have)

**Done when:** At end of month, one click produces a statement showing "Sam owes Alex 2,340 kr".

### Phase 9 — Polish & Portfolio Prep (Week 9+)
- [ ] Full README with screenshots, setup guide, architecture diagram
- [ ] Demo mode with fake data (for portfolio visitors)
- [ ] CONTRIBUTING.md, issue templates
- [ ] Hosted demo (Fly.io / Railway free tier)
- [ ] Blog post / writeup linking from README

---

## 7. The iOS "Home Shortcut" Flow — Concrete Spec

This is the feature that makes it feel magical. Here's exactly how it works:

1. User visits `https://<their-host>/` on iPhone, logs in once. Session persists via long-lived JWT in a cookie.
2. User taps Safari's Share → **Add to Home Screen**. The PWA manifest gives it a real icon and name ("Add Receipt").
3. Tapping the icon opens the app directly to `/receipt/new` in standalone mode (no browser chrome).
4. The page shows one big "📷 Capture Receipt" button that triggers the camera.
5. After capture, the image uploads in the background; a skeleton card shows "Processing…".
6. OCR finishes in 3–8 seconds. The card fills in with parsed values.
7. User taps **Save** (or edits first). Done — back to the big button, ready for the next receipt.

No native app. No App Store. No Apple Developer account. Just a well-done PWA.

**For Android users:** Same flow via Chrome's "Install App" prompt.

---

## 8. Security & Privacy Rules

Because this handles financial data:

- **No telemetry. No analytics. No external calls.** The app runs fully offline (except initial `npm install`).
- Passwords stored as argon2id hashes.
- Receipt images stored locally only — never uploaded to any cloud.
- HTTPS required in production; README provides Caddy config for free auto-cert.
- Sessions use httpOnly, SameSite=strict cookies.
- The app has **no multi-tenancy** — one DB = one household. Users trust each other.
- Database backup = copy one `.sqlite` file. Document this clearly.

---

## 9. What Goes in the Repo

```
expense-tracker/
├── README.md                  ← setup, screenshots, features
├── LICENSE                    ← MIT
├── CONTRIBUTING.md
├── docker-compose.yml         ← one-command deploy
├── Dockerfile
├── .env.example               ← no secrets in repo
├── PLAN.md                    ← this file, kept up to date
├── ARCHITECTURE.md            ← diagrams, data model, decisions
├── package.json
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/      ← OCR, reconciliation, settlement
│   │   │   ├── db/            ← schema, migrations, queries
│   │   │   └── server.ts
│   │   └── tests/
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       └── public/
│           ├── manifest.json  ← PWA config
│           └── icons/
├── scripts/
│   ├── seed-demo-data.ts
│   └── backup.sh
└── docs/
    ├── screenshots/
    ├── ios-shortcut-setup.md
    └── importing-bank-csv.md
```

---

## 10. README Structure (portfolio-quality)

Must include, in this order:

1. **One-sentence hook** + hero screenshot
2. **Badges**: MIT, CI status, version
3. **Why this exists** — 2-sentence problem statement
4. **Features list** with screenshots for each
5. **Quick start** — `docker-compose up` then browse to localhost
6. **iOS Shortcut setup** (linked doc with photos)
7. **Bank CSV import guide** (linked doc)
8. **Tech stack** — 3 lines
9. **Architecture** — link to ARCHITECTURE.md
10. **Roadmap** — link to GitHub Projects/Issues
11. **License** — MIT
12. **Credits** — Tesseract, shadcn/ui, etc.

---

## 11. Open Questions to Resolve Before Coding

You should answer these in writing before Phase 1 starts — pin them to a GitHub issue:

1. **Language of the UI** — Norwegian, English, or both (i18n from day one)?
2. **Currency** — NOK only, or multi-currency with an exchange rate API?
3. **Number of users per household** — hard-code 2, or support N?
4. **Splits other than 50/50** — needed now (for income-proportional splits) or later?
5. **Which bank format first?** — pick one bank's CSV and build to that. Pattern after that for the rest.
6. **Receipt retention policy** — keep forever, or auto-delete after N years?
7. **Demo deployment** — is there one, and where?

---

## 12. Success Criteria

The project is "done enough to show off" when:

- [ ] A stranger can clone the repo, run `docker-compose up`, and have a working instance in under 5 minutes.
- [ ] Two real users (you and your partner) have used it for one full month with no showstoppers.
- [ ] Receipt → ledger entry takes under 10 seconds of user time per receipt.
- [ ] Month-end settlement is one click.
- [ ] The README is good enough that a recruiter reading it would ask about the project in an interview.
- [ ] The codebase passes `lint`, `typecheck`, and `test` with zero warnings.

---

*Last updated: planning draft, pre-Phase-1*
