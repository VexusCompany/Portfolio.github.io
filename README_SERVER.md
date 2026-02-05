Support Relay Server (Telegram <-> Website)

Overview
- `server.js` is a small Node/Express app that:
  - Accepts POST `/forward` from the website and sends the message to the support Telegram chat (using BOT_TOKEN and SUPPORT_CHAT_ID env vars).
  - Accepts Telegram webhook POSTs at `/telegram-webhook` and emits incoming support replies to connected website clients via Socket.IO (`support_message` events).

Why this is needed
- Telegram replies are not pushed to your website automatically. To show replies in the user's browser you need a server-side component to receive Telegram updates (webhook) and push them to the browser (WebSocket).

Setup
1. Copy the repo files to your server.
2. Create a `.env` file with:

```
BOT_TOKEN=123456:ABCDEF_your_bot_token_here
SUPPORT_CHAT_ID=YOUR_CHAT_ID_OR_GROUP_ID
PORT=3000
```

3. Install dependencies and start:

```bash
npm install
npm start
```

4. Expose your server to the internet (ngrok for testing or host on real domain).

5. Set Telegram webhook (replace `https://yourserver.example.com`):

```bash
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" -d "url=https://yourserver.example.com/telegram-webhook"
```

6. In your website `supportConfig`, set `telegramWebhook` (optional) and `socketUrl` to your server URL, e.g. `https://yourserver.example.com`.

How it works
- When a visitor sends a message from the website, the frontend POSTs to `/forward` (recommended) which the server forwards to the support Telegram chat including the visitor `internal_id` (e.g. `sid-...`).
- Support staff reply inside Telegram and should reply to the bot message (use Telegram's reply function). The server receives the webhook update and parses the `reply_to_message` to extract the `internal_id`, then emits `support_message` via Socket.IO.
- The browser (connected via Socket.IO) receives `support_message` and displays it only when `internal_id` matches the visitor's session id.

Security notes
- Do NOT store bot tokens in frontend code. Use the server to keep tokens secret.
- Validate incoming webhook requests by checking `update.message` contents or restricting access (e.g., via secret path or token) if needed.

If you want, I can:
- Add an example `.env.example` and a small health endpoint.
- Modify the frontend to show a small notice when server/socket is unreachable.
