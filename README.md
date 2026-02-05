# NEXUS — Project Overview & Local Dev

This repository is a single-page website that has been split into modular files for easier editing and maintenance.

Structure
- `index (8).html` — main shell (loads CSS, libs, translations, and `js/main.js`).
- `css/style.css` — visual styles (extracted).
- `js/translations.js` — i18n strings loaded before `main.js`.
- `js/main.js` — main client logic (routing, chat, 3D, animations).
- `pages/` — page templates (home, nexus-edge, about, contact, service-template).
- `server/` — example Express proxy to forward chat messages to Telegram securely.

Telegram chat forwarding
- The client will attempt to POST messages to a proxy at `http://localhost:3000/api/send-telegram` by default. Edit `js/main.js` `TELEGRAM_PROXY_URL` if your proxy runs elsewhere.
- Do NOT place your bot token in client-side code for production. Use the server proxy and set environment variables on the server:

Windows PowerShell (temporary env for the session):
```powershell
$env:TELEGRAM_BOT_TOKEN = '123456:ABC-DEF...'
$env:TELEGRAM_CHAT_ID = '987654321'
node server/server.js
```

Linux / macOS:
```bash
export TELEGRAM_BOT_TOKEN='123456:ABC-DEF...'
export TELEGRAM_CHAT_ID='987654321'
node server/server.js
```

Quick notes
- `js/translations.js` contains `window.translations` used by `main.js`.
- `pages/` templates are partials; `index (8).html` currently includes all page markup but you can switch to fetching these templates later.
- Next recommended steps: run browser QA, verify chat via proxy, and finalize accessibility audits.
