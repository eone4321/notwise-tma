# Not Wise: Guide

Telegram Mini App and browser guide, built with React, Vite and TypeScript.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Production bundle: `npm run build`. Telegram features degrade to browser behavior outside Telegram. Static guide content is bundled locally, so the guide works without the optional market API. The secret popup is intentionally a joke and never creates an invoice. Voluntary Stars donations are available only from the explicit Support screen when the bot API is configured. In local Vite mode, `/api` is proxied to `http://127.0.0.1:8787`. Start the existing bot service with `BOT_TOKEN` set to enable authenticated donation invoices and live market data. Market data is optional; static guide content remains available when the API is offline.

## Current scope

Implemented guide screens include capsule probabilities and calculators, egg loot and hunger guidance, the 100-sticker catalog and 20 albums, Getgems collections, token quotes, 20 combat skills and builds, secrets and achievements, and explicit Stars support. The API validates Telegram initData and invoice ownership. Production deployment still needs an HTTPS reverse proxy for `/api`, configured bot credentials, and verification in a real Telegram client. See `../NotWise_docs/NOT_WISE_GUIDE_IMPLEMENTATION.md` for the product contract and acceptance checklist.

## Visitor log and referrals

The Vercel endpoint `/api/guide/profile` checks Telegram's signed init data on
every request. It rejects launches older than one hour. Reopen the Mini App
if the current session expires. Add these environment variables to the
production Vercel project and redeploy:

- `BOT_TOKEN` for the Telegram bot that serves the Mini App.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for a private Redis database.
- `GUIDE_ADMIN_IDS` set to comma-separated Telegram numeric IDs allowed to view
  the authenticated `/admin` screen.

The Main Mini App link defaults to `https://t.me/NotWiseGuideBot?startapp`. Set
`VITE_GUIDE_TMA_URL` at build time if the bot uses a different direct Mini App URL.

The backend stores each verified visitor's Telegram ID, display name, first and
last visit, optional game invite link, and first referral to the guide. The
referral list shown to the inviter contains names and first-visit dates.
Game-side referrals and the old bot's records are separate data sources.
The new visitor log starts when the endpoint is configured. Regular guide
content remains available if the profile service is unavailable.
