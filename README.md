# Poorman's Marriage

A self-hostable expense tracker for two people sharing a household. Runs on your own machine. Nothing leaves it.

Built around the idea that you have one shared card, recurring bills that arrive as digital invoices, and occasionally a private card that ends up paying for a shared thing. The app reconciles your bank statement against the receipts you snap, flags what's missing, and tells you who owes whom at month end.

## What it does

- Snap a receipt on your phone, OCR pulls out date, total, merchant, card last-four.
- Log recurring bills (power, water, internet, insurance) that arrive as invoices.
- Import bank statement CSVs from 10 Nordic banks, auto-match against your receipts.
- Learn which merchant belongs to which category - "Haugaland Kraft" becomes "Power" for every future import.
- Plot a cumulative expense curve, drop checkpoint markers ("installed a heat pump, 40 000 kr"), and get a payback estimate against the trend.
- One-click monthly settle-up with a printable PDF statement.

## Install

Pick the path that fits you.

### Desktop app (easiest - double-click, no terminal)

Grab the installer for your OS from the [Releases page](https://github.com/OlavYrkeBleie/PoormansMarriage/releases):

- Windows: `Poormans-Marriage-Setup-<version>.exe`
- macOS: `Poormans-Marriage-<version>.dmg`
- Linux: `Poormans-Marriage-<version>.AppImage`

Launch, register two users on first run, done. The backend runs inside the app on a loopback port. Data lives at:

- Windows: `%APPDATA%\poormans-marriage\data`
- macOS: `~/Library/Application Support/poormans-marriage/data`
- Linux: `~/.config/poormans-marriage/data`

### Server mode (one command)

For always-on use (NAS, Raspberry Pi, home server, cheap VPS):

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/OlavYrkeBleie/PoormansMarriage/main/install.sh | bash
cd PoormansMarriage
npm run dev
```

**Windows PowerShell:**
```powershell
iwr -useb https://raw.githubusercontent.com/OlavYrkeBleie/PoormansMarriage/main/install.ps1 | iex
cd PoormansMarriage
npm run dev
```

Open `http://localhost:5173` (dev) or `http://localhost:3100` (after `npm run build && npm start`).

### Docker

```bash
git clone https://github.com/OlavYrkeBleie/PoormansMarriage.git
cd PoormansMarriage
cp .env.example .env
# edit JWT_SECRET in .env
docker compose up -d
```

### From source

Requires Node.js 20+ and npm 10+.

```bash
git clone https://github.com/OlavYrkeBleie/PoormansMarriage.git
cd PoormansMarriage
cp .env.example .env
# edit JWT_SECRET in .env
npm install
npm run db:seed
npm run dev
```

Full step-by-step with troubleshooting: [docs/SETUP.md](docs/SETUP.md).

## Using it on your phone

The app is a PWA that installs to your phone's home screen and opens the camera with one tap.

1. Make sure the phone and the machine are on the same Wi-Fi.
2. In the desktop app, open **Settings > Phone access**. You get a list of URLs (like `http://192.168.1.42:3100/`) and a QR code.
3. Scan the QR with your phone camera, sign in, and "Add to Home Screen".
4. Tap the new icon - it opens straight on the camera capture screen.

Detailed walkthrough: [docs/ios-shortcut-setup.md](docs/ios-shortcut-setup.md).

## Where your data lives

Two things, both on the machine that runs the app:

- `data/app.sqlite` - the database. Every expense, user, category, bank transaction, receipt metadata.
- `data/receipts/<uuid>.jpg` - the original receipt images, named by a random UUID.

That's it. No cloud, no third-party services, no API keys.

**Backup strategy:** copy `data/` somewhere safe. There's a `scripts/backup.sh` that tars it into a timestamped archive. Drop the archive in whatever cloud storage you already have (OneDrive, Dropbox, Google Drive, a rsync target, a USB stick). Restore by copying it back.

If you want automated off-site backup, `rclone` + a cron job works. The app does not do this for you by design - it doesn't phone home, and it doesn't need internet.

## Supported banks

CSV statement import is tested with:

- SpareBank 1
- DNB
- Nordea
- Handelsbanken
- Sbanken (formerly Skandiabanken)
- Danske Bank
- Storebrand
- SpareBank 1 SR-Bank
- Fana Sparebank

Plus a generic Nordic adapter that handles most `;`- or `,`-separated CSVs with columns like "Dato", "Beløp", "Forklaring" or "Date", "Amount", "Description".

Adding a new bank is one ~5 line file in `apps/backend/src/services/bank/adapters/`.

## Tech stack

Fastify, Drizzle ORM, SQLite (better-sqlite3), Tesseract.js, React, Vite, Tailwind, Recharts, Electron (for the desktop app).

## License

MIT. See [LICENSE](LICENSE).

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the dev loop.
