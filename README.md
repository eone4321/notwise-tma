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
