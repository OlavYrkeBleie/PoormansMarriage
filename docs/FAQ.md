# FAQ

## Adding a receipt from an iPhone (or Android)

### First-time setup

1. Run the app on your PC (`npm run dev` in the repo, or launch the desktop app). Leave it running.
2. When Windows Defender asks to allow Node through the firewall, allow it for **Private** networks only. Do not allow Public.
3. Make sure your phone is on the **same Wi-Fi** as the PC. 4G / 5G does not reach your PC.
4. On the PC, open `http://localhost:5173` (dev) or the desktop app window, sign in, and go to **Settings > Phone access**. You'll see one or more URLs like `http://192.168.1.57:5173/` plus a QR code.
5. On the iPhone, open the **Camera** app and point it at the QR code. When the banner appears, tap it - Safari opens the same URL.
6. Sign in with the same account.
7. Tap the Safari **Share** icon (square with arrow, in the bottom toolbar), scroll down, tap **Add to Home Screen**. Name it "Add Receipt" or whatever. Tap Add.

### Every time you want to snap a receipt

1. Tap the home-screen icon. The app opens without Safari chrome.
2. It lands on the camera capture screen (that's the PWA `start_url`).
3. Tap **Capture receipt**. iOS asks for camera permission the first time - allow it.
4. Frame the receipt, snap the photo, tap Use Photo.
5. The draft card shows "Processing..." for 3-8 seconds while OCR runs on the PC.
6. Values fill in: date, total, merchant, card last-four. Edit if OCR got anything wrong.
7. Tap **Save**. You're back on the capture screen ready for the next one.

### "Can't connect" / phone hangs on the URL

- Firewall: `wf.msc` on the PC > Inbound Rules > find `Node.js JavaScript Runtime` > make sure Enabled = Yes and Private profile is checked. If there's no entry, create one for `node.exe` on TCP port 3100 (and 5173 if you're in dev mode).
- VPN: turn it off on both devices for the duration. Most home VPNs block LAN traffic between client devices.
- Wrong URL: the LAN IP changes when you reconnect to Wi-Fi. Re-check Settings > Phone access.
- Different subnet: if the PC is on 192.168.1.x and the phone on 192.168.2.x (some routers put guest Wi-Fi on a separate subnet), they can't reach each other. Put the phone on the main Wi-Fi.

---

## Security / trust

### Is it safe to have the app bound to my LAN?

Only on networks you control (your own home Wi-Fi). Do not run the app connected to a cafe hotspot, hotel Wi-Fi, airport, or any public network. The app trusts anyone on the local network who reaches it - they just need the password of an existing account to log in, but it's still a bigger attack surface than loopback-only.

Concretely:
- At home on your own router: fine.
- Hotel / cafe: disconnect the PC from that Wi-Fi before running the app, or just use the desktop app (it runs on loopback from the phone's perspective too - your phone needs to be on the same Wi-Fi anyway, so hotel Wi-Fi doesn't help there either).
- Work network: same rule - trust the network or don't run the app on it.

### Does it upload my receipts anywhere?

No. Receipt images are saved to the `data/receipts/` folder on whatever machine runs the app. OCR runs locally through Tesseract.js, bundled inside the app. There are no outbound API calls except for the initial `npm install` (to fetch dependencies, which is then cached).

### Does the app let anyone on my network read other households' data?

Each install is a single-household instance. There is no multi-tenancy. If two households want to use the app, they run two separate installs on two separate machines. Users within one instance see all expenses - that's by design: you're sharing a household ledger with someone.

### Do my bank details leave my machine?

No. You upload your own bank CSV export by hand. The app does not connect to your bank, does not scrape, does not use any bank API. There are no credentials for banks anywhere in the app.

### What happens if someone steals my laptop?

They get everything. The SQLite file is not encrypted at rest. If that matters to you, enable BitLocker on Windows / FileVault on macOS / LUKS on Linux and treat the SQLite file like any other sensitive document. The app uses argon2id to hash user passwords, so account passwords are safe, but the data behind them isn't.

---

## Data & backup

### Where is my data exactly?

Two things:
- `data/app.sqlite` - the database (every expense, user, category, bank transaction).
- `data/receipts/<uuid>.jpg` - the original receipt images.

Location depends on install mode:

| Install mode | `data/` location |
|---|---|
| From source / Docker | `<repo>/data/` |
| Desktop app (Windows) | `%APPDATA%\poormans-marriage\data` |
| Desktop app (macOS) | `~/Library/Application Support/poormans-marriage/data` |
| Desktop app (Linux) | `~/.config/poormans-marriage/data` |

### How do I back up?

Copy `data/` somewhere safe. That is the complete backup. To restore, copy it back.

Pragmatic options:
- One-off: `scripts/backup.sh` (Linux/macOS) writes a timestamped tar.gz.
- Continuous: put `data/` inside a folder that OneDrive / Dropbox / iCloud already syncs.
- Proper: `rclone` + cron syncing to S3, Backblaze, Google Drive, or any of 40+ other targets.

### Can the app back itself up to Google Drive / iCloud / OneDrive?

Not directly, on purpose. Adding cloud integrations means OAuth, tokens, secrets in the repo, a list of supported providers to maintain, and people's data passing through the app instead of sitting on disk. The design choice is to do one thing well (track shared expenses locally) and let you use whatever sync tool you already trust for backup.

If you want it one-click, put `data/` inside `C:\Users\<you>\OneDrive\poormans-marriage-data\` and set `DATA_DIR=C:/Users/.../OneDrive/poormans-marriage-data` in `.env`. OneDrive will sync any change to `data/app.sqlite` and every new receipt image automatically.

---

## Everyday use

### The OCR read the total wrong. How do I fix it?

Edit the expense - change the amount, save. Simple. The OCR fills in a draft; the review screen is the source of truth.

### My "fixed" bill went up / down. What do I update?

Nothing. `Settings > Recurring bills` stores an **expected amount**, which is only used as a sanity-check warning. The real amount of each month's bill comes from whatever bank transaction or invoice actually arrives. Prices changing is not a problem the app tries to "fix".

### I paid for something on my personal card but it was shared. How do I log that?

Add the expense, pick your personal card under Card, pick yourself under Paid by. The split is still 50/50 (or whatever you want). The app will show the other person owing you half in the balance at the top.

### I accidentally put a personal purchase on the shared card. How do I exclude it?

Open the expense, tick Excluded, save. It stays in the list (so your bank reconciliation still works) but is not counted toward the split.

### What's a checkpoint?

A one-time cost you want to track for payback analysis. Example: you install a heat pump for 40,000 kr and want to know how long before the lower electricity bills pay for it. Under Trends, you add a checkpoint dated the install day, amount 40,000, category "Power & Electricity". Wait a few months for real data, then the app computes avg monthly power spend before vs after and estimates months-to-payback.

### How do I settle up at month end?

Go to Reports, pick the period (e.g. this month), hit Record settlement. That takes the sum on the "settle-up suggestion" line and writes it as a pending settlement. When the transfer clears in real life, open the settlement in the list and mark it paid. The balance at the top of the dashboard resets.

---

## Running / install

### I changed the port in `.env`. Nothing works now.

If you change `PORT=3100`, also change the proxy target in `apps/frontend/vite.config.ts` to match. In production mode (`npm run build && npm start`) only `PORT` matters.

### `npm install` takes forever on Windows.

First run compiles / downloads native prebuilts for `better-sqlite3`, `sharp` (for the icon generator), and Electron. Expect 3-5 minutes. Subsequent `npm install` calls use the cache and take ~10 seconds.

### "Port 3100 already in use" on first run.

Something else is listening on 3100 (a random dev server, an Electron leftover). Change `PORT=3101` in `.env` and update `apps/frontend/vite.config.ts` proxy target.

### Can I self-host this on a VPS or a Pi?

Yes. That's the whole point of "self-hostable". Run `npm run build && npm start` behind a reverse proxy (Caddy gives you free HTTPS in three lines). Put it on a private port, set up auth via your reverse proxy if you want extra paranoia.

### How do I update to the latest version?

From source: `git pull && npm install && npm run db:seed` (migrations re-run idempotently).
Docker: `git pull && docker compose build && docker compose up -d`.
Desktop app: download the newer installer and run it. Your data is untouched.
