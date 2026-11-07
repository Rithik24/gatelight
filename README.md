# Gatelight Camera

A film-look camera web app for Android (built for a Pixel 8). Tap the shutter to open the phone's own camera; the photo comes back developed through a film stock with halation, grain, tone curve and vignette. Everything runs on the phone; no photo ever leaves it.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app screen |
| `film.js` | The film engine (stocks, tone curve, halation, grain) |
| `manifest.webmanifest`, `sw.js`, `icons/` | What makes it installable and work offline |
| `tools/serve.ps1` | Local test server: `powershell -ExecutionPolicy Bypass -File tools\serve.ps1` then open http://localhost:8765 |
| `tools/test.html` | Test bench: every stock side by side on a photo. Put photos in `test-photos/` and open `http://localhost:8765/tools/test.html?p=/test-photos/yourphoto.jpg` |
| `tools/make-icons.ps1` | Redraws the icons |

## Putting it on the phone

The phone can only install it as an app from an **https** address. Any free static host works (GitHub Pages, Netlify, Cloudflare Pages): upload everything in this folder except `tools/` and `.claude/`. Then on the Pixel open the address in Chrome → ⋮ → **Install app**.

After changing any file, bump `VERSION` in `sw.js` so installed copies pick up the update.
