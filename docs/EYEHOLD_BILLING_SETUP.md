# Eyehold billing setup

Hosted billing is prepared for Stripe live mode. `CREDITS.live` and `CLOUD_LIVE` are true, so the site and the app offer a purchase. `EYEHOLD_UPDATES_ENABLED` stays false. Crowns stay non-transferable points and are not these credits.

This document does not deploy the Worker. The copy already running stays in test mode until the owner deploys the tree in `docs/DEPLOY.md`.

The host is `eyehold.babelbook.net`, from `eyehold.host.json`. The Worker is `services/portal` (the billing Wrangler file points at that same script). Both Wrangler files set `STRIPE_MODE=live` and bind `BILLING_KV` to `c59822282bcf4f1294f4522c7f07a026`. Do not add routes under `babelbook.net/*` and do not deploy or edit the babelbook-staging Worker.

## Stripe

`STRIPE_MODE` selects the key and the event.

| `STRIPE_MODE` | Secret | Webhook `livemode` |
| --- | --- | --- |
| `live` | `sk_live_` or `rk_live_` | `true` only. A test key or a test event is rejected. |
| `test` | `rk_test_` or `sk_test_` | `false` only. A live key or a live event is rejected. |

The hosted files are set to `live`. A restricted live key is preferred.

1. In the Stripe live account, create a secret or restricted key that can create Checkout Sessions and read their results.
2. `npx wrangler secret put STRIPE_SECRET_KEY` from `services/portal`. Paste the live key when asked. Do not write it into a file.
3. Add the live endpoint `https://eyehold.babelbook.net/billing/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Do not subscribe `checkout.session.async_payment_failed`; the Worker ignores that event.
4. `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with that live endpoint's signing secret. The test endpoint secret will not verify live events.
5. Exempt only `POST /billing/webhook` from Cloudflare Access. Stripe cannot present an Access login. The signature check is the authentication for that path. Every other billing path requires an allowlisted Access email.

Checkout uses Checkout Sessions in `payment` mode and does not send `payment_method_types`. It sends `managed_payments[enabled]=false` because this Stripe account has Managed Payments on, which otherwise requires a product tax code. Fulfillment happens in the webhook, and only when `payment_status` is `paid`, the amount matches the pack, and the event mode matches `STRIPE_MODE`. A replayed session does not add credits twice. The signature window and the replay id are unchanged.

## Access and accounts

`EYEHOLD_ACCESS_EMAILS` is the v1 allowlist, comma-separated. Each allowed email has its own credit balance, keyed `email:`. A later Eyehold Supabase project, not Babelbook's, can replace that key with its own user id. Do not point this Worker at Babelbook's database.

## Durable storage

When `BILLING_KV` is bound, receipts and credit balances persist in that namespace. Tests and the local purchase script that omit the binding use an in-memory ledger. The namespace is `eyehold-BILLING_KV`, id `c59822282bcf4f1294f4522c7f07a026`.

## Not yet

Do not deploy from this tree until the live secret and the live webhook signing secret are set. Missing finance stays unavailable. A credit balance is not revenue until an operator reviews the USD receipt into the finance store. Auto-update stays off.
