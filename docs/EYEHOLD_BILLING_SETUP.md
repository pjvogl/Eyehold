# Eyehold billing setup

Managed credits are a test-mode scaffold. `CREDITS.live` and `CLOUD_LIVE` stay false, so the app does not offer a purchase. Crowns stay non-transferable points and are not these credits.

The host is `eyehold.babelbook.net`, from `eyehold.host.json`. The Worker is `services/portal` (the billing Wrangler file points at that same script). The custom domain is declared in both Wrangler files and is not attached until the owner follows `docs/DEPLOY.md`. Do not add routes under `babelbook.net/*` and do not deploy or edit the babelbook-staging Worker.

## Stripe

Use a Stripe sandbox for this integration, not the shared live account. Prefer a restricted key (`rk_test_`). A secret test key (`sk_test_`) is accepted. Live keys are rejected.

1. Create a sandbox and a restricted key that can create Checkout Sessions and read their results.
2. `npx wrangler secret put STRIPE_SECRET_KEY` from `services/billing`. Paste the test key when asked. Do not write it into a file.
3. In the Stripe dashboard, add the endpoint `https://eyehold.babelbook.net/billing/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with that endpoint's signing secret.
5. Exempt only `POST /billing/webhook` from Cloudflare Access. Stripe cannot present an Access login. The signature check is the authentication for that path. Every other billing path requires an allowlisted Access email.

Checkout uses Checkout Sessions in `payment` mode and does not send `payment_method_types`. Fulfillment happens in the webhook, and only when `payment_status` is `paid`. A replayed session does not add credits twice.

## Access and accounts

`EYEHOLD_ACCESS_EMAILS` is the v1 allowlist, comma-separated. Each allowed email has its own credit balance, keyed `email:`. A later Eyehold Supabase project, not Babelbook's, can replace that key with its own user id. Do not point this Worker at Babelbook's database.

## Durable storage

When `BILLING_KV` is bound, receipts and credit balances persist in that namespace. Tests and the local purchase script that omit the binding use an in-memory ledger. The id in both Wrangler files is still a placeholder of zeros. Create the namespace and replace the id before deploy, as `docs/DEPLOY.md` describes. Do not deploy with the placeholder.

## Not yet

Do not deploy from this tree. Do not set `CREDITS.live` or `CLOUD_LIVE` to true until a webhook delivery has been verified against the sandbox. Missing finance stays unavailable. A credit balance is not revenue until an operator reviews the USD receipt into the finance store.
