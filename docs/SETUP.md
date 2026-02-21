# Setup guide

Step-by-step install for someone who forks the repo and wants it running in about ten minutes.

Nothing leaves your machine. The app is local-only by design. You do not need to sign up for anything. You do not need an API key for anything.

---

## A. Desktop app (no terminal needed)

The easiest path for one machine used by two people in the same house.

1. Go to the [Releases page](https://github.com/OlavYrkeBleie/PoormansMarriage/releases).
2. Download the installer for your OS:
   - Windows: `Poormans-Marriage-Setup-<version>.exe`
   - macOS: `Poormans-Marriage-<version>.dmg`
   - Linux: `Poormans-Marriage-<version>.AppImage`
3. Run it. On Windows it creates Start menu + desktop shortcuts. On macOS drag it into Applications. On Linux `chmod +x` and double-click.
4. Launch the app. First run: register two users. Any name + password (6+ characters).
5. Go to **Settings > Cards** and register each card you use (label + last four digits + shared or personal).

Done. Start adding expenses.

### Where the data is

- Windows: `%APPDATA%\poormans-marriage\data`
- macOS: `~/Library/Application Support/poormans-marriage/data`
- Linux: `~/.config/poormans-marriage/data`

Back that folder up (see [Backing up](#backing-up) below).

---

## B. From source

Fork the repo, clone it, run three commands. Works the same on Windows, macOS, Linux.

### 1. Prerequisites

Install Node.js 20+ and Git.

- Windows: [Node.js installer](https://nodejs.org/) (pick LTS) + [Git for Windows](https://git-scm.com/).
- macOS: `brew install node git` (Homebrew from https://brew.sh/ if you don't have it).
- Ubuntu/Debian: `sudo apt install -y git curl && curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`.

Verify:
```bash
node -v     # v20.x or newer
npm -v      # 10.x or newer
git --version
```

### 2. Clone and configure

```bash
git clone https://github.com/<your-fork>/PoormansMarriage.git
cd PoormansMarriage
cp .env.example .env
```

Open `.env` and replace `JWT_SECRET=` with a long random string. Quick one-liners:

```bash
# Linux / macOS
openssl rand -base64 48

# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```

Leave other values alone unless you have a reason.

### 3. Install and seed

```bash
npm install
npm run db:seed
```

That compiles native modules, creates `data/app.sqlite`, and inserts the default categories.

### 4. Run

Development (hot reload):

```bash
npm run dev
```

Backend on http://localhost:3100, frontend on http://localhost:5173. Open the frontend URL.

Production (single process):

```bash
npm run build
npm start
```

Everything served from http://localhost:3100.

### 5. Build the desktop app yourself

```bash
npm run desktop:icons     # generate icons from icon.svg (once)
npm run desktop:make      # produces release/ with the installer
```

Output goes to `apps/desktop/release/`:
- Windows: `Poormans-Marriage-Setup-<version>.exe` (NSIS installer)
- macOS: `Poormans-Marriage-<version>.dmg`
- Linux: `Poormans-Marriage-<version>.AppImage`

You can only build for your current OS unless you set up cross-compilation.

---

## C. Docker

```bash
git clone https://github.com/OlavYrkeBleie/PoormansMarriage.git
cd PoormansMarriage
cp .env.example .env
# edit JWT_SECRET in .env
docker compose up -d
```

Data persists in `./data/`. Open http://localhost:3100. To update:

```bash
git pull
docker compose build
docker compose up -d
```

---

## First-time setup

Whichever install path you took, once the app is open:

1. **Register** two users. Display name + password (6+ chars). The first one to register gets user id 1; the second gets 2.
2. **Add cards** under Settings > Cards:
   - Your shared card (check "shared"), with its last 4 digits. Receipts get auto-linked by last-four during OCR.
   - Each person's personal card (uncheck "shared", set owner).
3. **Add recurring bills** under Settings > Recurring bills: power, water, internet, insurance, rent/mortgage. Category, cadence (monthly/quarterly/annual), expected amount (rough, just a sanity check), next expected date.
4. **Toggle receipt requirements** under Settings > Categories. Power, water, insurance arrive as invoices - toggle "Receipt required?" to No so they don't falsely show up as missing during reconciliation.

You're ready.

---

## Using it on your phone

The app is a PWA - it installs to the phone home screen and opens the camera with one tap.

1. Make sure your phone is on the same Wi-Fi as the machine running the app.
2. In the desktop view, open **Settings > Phone access**. It shows URLs like `http://192.168.1.42:3100/` and a QR code.
3. Scan the QR with the phone camera, or type the URL into Safari (iOS) / Chrome (Android). Sign in with the same credentials.
4. iOS: Share -> Add to Home Screen. Android: the browser offers "Install app".
5. Tap the new icon. The app opens in standalone mode straight on the camera capture screen.

Detailed iOS walkthrough: [ios-shortcut-setup.md](ios-shortcut-setup.md).

**Firewall note:** if the phone cannot reach the URL, the machine's firewall is blocking port 3100 on the private network. Allow it for the private profile only. Do not expose port 3100 to the internet.

---

## Backing up

All app state is under `data/`:

- `data/app.sqlite` - database
- `data/receipts/` - receipt images

Copy `data/` somewhere safe. That is the whole backup.

### Manual

Linux/macOS:
```bash
./scripts/backup.sh ~/backups
# writes ~/backups/pm-backup-<timestamp>.tar.gz
```

Windows: copy the `data` folder (or `%APPDATA%\poormans-marriage\data` if using the desktop app) to OneDrive / Dropbox / a USB stick.

### Automated off-site backup

The app does not touch the cloud. You do. Options:

- **Syncthing / rclone + cron** - sync `data/` to any backend (S3, Backblaze, Google Drive, Dropbox). rclone alone supports 40+ clouds.
- **OS-level sync folder** - if `data/` lives inside a folder already watched by OneDrive / iCloud / Dropbox, it's backed up whenever those sync.
- **NAS snapshot** - run the app on a NAS and use its native snapshot feature.

### Restore

Replace `data/` with the backed-up copy. Start the app.

---

## Updating

From-source install:
```bash
cd PoormansMarriage
git pull
npm install          # any new deps
npm run db:seed      # runs any new migrations (safe to re-run)
npm run dev          # or `npm run build && npm start` for prod
```

Docker:
```bash
git pull
docker compose build
docker compose up -d
```

Desktop app: download and run the newer installer. Your data is untouched.

---

## Adding a new bank

CSV formats vary. The bundled adapters cover the main Nordic banks. For anything else:

1. Create `apps/backend/src/services/bank/adapters/<name>.ts`:
   ```ts
   import { parseGenericNordicCsv, type ParsedBankRow } from "./generic.js";
   export function parseMyBankCsv(content: string): ParsedBankRow[] {
     return parseGenericNordicCsv(content, { delimiter: ";" });
   }
   ```
2. Register it in `apps/backend/src/services/bank/registry.ts` - add a line to `BANKS` at the top of the array (the UI uses this order).
3. Test. If the generic parser can't find the date/amount/description columns, edit `generic.ts` to add your CSV's column names to `DATE_COLS` / `AMOUNT_COLS` / `DESC_COLS`.

---

## Troubleshooting

**Port 3100 already in use**
Change `PORT=3100` in `.env` to a free port (e.g. 3200), and update the proxy target in `apps/frontend/vite.config.ts` to match.

**"Missing required env var: JWT_SECRET"**
You didn't edit `.env`. Generate a random string (see step 2 above) and put it after `JWT_SECRET=`.

**npm install fails on Windows (Visual Studio / node-gyp errors)**
Upgrade Node to the latest 20+. `better-sqlite3` 12.x has prebuilts for recent Node versions and does not need a C compiler.

**"Unauthorized" everywhere after a week**
Session cookie expired. Log back in. Sessions last 7 days and auto-renew on use.

**Phone cannot reach the app on LAN**
Windows Defender or macOS firewall blocking inbound port 3100. Allow it for the private/home network only. Do not expose it to the internet.

**OCR is slow or wrong on Norwegian receipts**
Make sure `OCR_LANGS=nor+eng` in `.env`. First receipt downloads the language packs (~10 MB); after that it's cached.

**Bank CSV import says "Imported 0"**
The CSV format isn't recognized. Try the "Other (generic Nordic CSV)" option. If that also yields zero, open the CSV and check the column headers - the generic parser looks for "Dato"/"Date", "Beløp"/"Amount", "Forklaring"/"Description". Add your bank's headers to `apps/backend/src/services/bank/adapters/generic.ts`.

**Dark mode has invisible buttons**
Ancient bug. Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R) to pick up new CSS.
