# Not Wise: Guide

Telegram Mini App and browser guide, built with React, Vite and TypeScript.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Run `npm run typecheck` and `npm run build` to check the production bundle.
Vite proxies `/api` to `127.0.0.1:8787` in local development. The guide remains
readable in a browser with local progress when the Telegram APIs are unavailable.

## Visitor log and referrals

The Vercel endpoint `/api/guide/profile` checks Telegram's signed init data on
every request. It rejects launches older than one hour. Reopen the Mini App
if the current session expires. Add these environment variables to the
production Vercel project and redeploy:

- `BOT_TOKEN` for the Telegram bot that serves the Mini App.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for a private Redis database.
- `GUIDE_ADMIN_IDS` set to comma-separated Telegram numeric IDs allowed to view
  the authenticated `/admin` screen. If unset, only the owner of the CryptoOne
  Telegram channel can open it. The guide bot must be an administrator in that
  channel for Telegram to verify ownership.

The Main Mini App link defaults to `https://t.me/NotWiseGuideBot?startapp`. Set
`VITE_GUIDE_TMA_URL` at build time if the bot uses a different direct Mini App URL.

The backend stores each verified visitor's Telegram ID, display name, first and
last visit, optional game invite link, and first referral to the guide. The
referral list shown to the inviter contains names, first-visit dates, and
Telegram avatars when provided.
Game-side referrals and the old bot's records are separate data sources.
The new visitor log starts when the endpoint is configured. Regular guide
content remains available if the profile service is unavailable.

Analytics is available under About → Open admin or directly at `/admin`
inside Telegram. It counts verified Telegram users per UTC day and records a
fixed set of section views and game, channel and sharing actions. The same
user and event count once per 15 minutes. Redis keeps aggregate totals for
31 days and temporary keyed hashes for deduplication. It stores no personal
links or message content in analytics. Channel taps in this report measure
outbound clicks. The Telegram invite link measures joins.

## Progress and Stars

Secrets, achievements, and collected stickers are stored per verified
Telegram user. The first sync imports browser marks. Completion rates
use the number of registered Telegram visitors and appear from 50 users.

The Vercel API creates Stars invoices from the support screen and records
payments in Redis after it receives Telegram’s `successful_payment`
update. For `/api/bot`, configure Telegram’s webhook secret as the
hex-encoded HMAC-SHA256 of `notwise-guide:webhook:v1` keyed by the bot token.
Set it as the webhook’s `secret_token` and include `message` and
`pre_checkout_query` in the accepted updates. Refresh the secret when the
bot token changes. The `/paysupport` command points users to CryptoOne.

## Game data

The live public game client at `https://prod.notwise.co/` provides the sticker
catalog, mode unlock levels, owl progression, skill effects, capsule and egg
fallback odds. Egg drop odds in the guide use the same at-least-one calculation
as the game. The `quarks/nw-new.json` resource is a scene asset for visual effects.
The game API serves shop prices, item traits, sticker odds and account-specific
referrals to authenticated game sessions. The guide uses verified names, art
and client values, plus live Getgems prices for NFT collections.

Saving an in-game referral link requires membership in `@cryptoeone`.
Give the Mini App bot administrator access in that channel so Telegram's
`getChatMember` can verify membership. Previously saved links become active
after their owners save them again with a verified subscription.

## NOT Wise owl sale alerts

The private Vercel schedule `owl-sales` runs every fifteen minutes, subject to the Hobby plan's dispatch window. Private chat
users opt in via `/owlsales` or the bot's subscription link and can stop with
`/stopowlsales`. Redis stores the feed checkpoint, pending sales and delivery
receipts. The bot checks sales from the moment subscriptions first opened.

With `GETGEMS_READ_TOKEN`, the worker reads `sold` results from Getgems Read API.
With the default environment, TON Center identifies transfers in the Genesis
collection, and TonAPI verifies successful Getgems purchases and their amounts.
The alert includes the NFT link and an estimated USD equivalent at the time
of notification.

## Settings and Getgems

A private `/start` or Telegram write-access grant enables Genesis notifications
by default. The user's switch in Settings or `/stopowlsales` takes precedence.
With `GETGEMS_READ_TOKEN` configured the poller supports opt-in completed sales
for skins, items and sticker albums. Bot messages require Telegram permission
to contact the user.

Collection floor and issued supply use public Getgems collection stats. Item
floor groups fixed-price native-currency listings by game asset slug. It uses
the Getgems API when a read token is configured and identifies Getgems listings
in the public TON index otherwise. Prices are only published after a complete
scan. Optional verified game data can be supplied via `GAME_MINT_QUOTES_JSON`
(asset slug to price in GRAM) and `GAME_ALBUM_ISSUE_JSON` (album ID to in-game
remaining issue count).

`GUIDE_CHAT_ID` may override the discussion chat attached to `@cryptoeone`.
The bot needs administrator access in the discussion chat to check membership.
Squad achievements can be delivered by the game backend using a POST to
`/api/guide/squad-member` with a JSON body
`{"telegramUserId":"123456","squadId":575801}` after a successful membership change.
Configure a shared secret of at least 32 characters in `GUIDE_SQUAD_WEBHOOK_KEY`.
Send the Unix timestamp in seconds in `X-Notwise-Timestamp` and lowercase
hex HMAC-SHA256 of `timestamp.rawBody` in `X-Notwise-Signature`.
The caller sets the content length and the signature covers the exact body.
The event can be retried safely within the five-minute signature window.
