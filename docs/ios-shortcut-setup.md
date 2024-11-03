# iOS "Add Receipt" home screen setup

Fastest flow: snap a receipt, confirm the values, done. No App Store, no Apple Developer account.

## 1. Install as a PWA

1. Open Safari on your iPhone and navigate to `https://<your-host>/login`.
2. Sign in once. The session cookie lasts 7 days and auto-renews on use.
3. Tap the Share icon, then "Add to Home Screen".
4. Name it "Add Receipt". Drag the new icon somewhere reachable with your thumb.

The manifest (`apps/frontend/public/manifest.json`) points `start_url` at `/receipts/new`, so launching the icon drops you straight on the camera screen.

## 2. The capture flow

1. Tap the icon. The page opens in standalone mode (no Safari chrome).
2. Tap "Capture receipt". iOS opens the camera.
3. Snap the receipt. iOS returns you to the page.
4. While OCR runs (3-8 seconds on a modern receipt), the draft card shows "Processing...".
5. Values fill in: date, total, merchant, card last-four. Tap "Save".

## 3. Optional: Shortcuts app variant

If you prefer Apple's Shortcuts app, create a new shortcut with two actions:

1. "Take Photo" (front camera: off, flash: auto)
2. "Get Contents of URL" - URL = `https://<your-host>/api/receipts`, method POST, request body "Form", add a file field named `image` containing the photo.

Add it to your home screen from Shortcuts. Saves the extra tap to confirm the camera at the cost of losing the review screen until you reopen the app.

## 4. Troubleshooting

- "Can't upload in standalone mode" - iOS before 16 had quirks with `<input capture>` inside PWAs. Update iOS.
- Session expired - open the PWA once a week and interact with anything; the cookie refreshes.
- OCR is way off - make sure you have `OCR_LANGS=nor+eng` in `.env`. Fuzzy thermal receipts are the hardest case; the review screen is there for a reason.
