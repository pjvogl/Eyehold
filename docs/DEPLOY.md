# Eyehold deploy runbook

## Status (2026-11-25, TEST MODE)

Deployed with the owner's approval, Stripe still in test mode:

- Worker `eyehold` (version 1, `4f9f8f94-c453-4640-a036-091ca8bb4731`), workers.dev and preview URLs off, in the Cloudflare account that owns the `babelbook.net` zone (the only account that can attach a custom domain on that zone). babelbook-staging was not changed.
- Workers custom domain `eyehold.babelbook.net` (Cloudflare created its DNS record). No `babelbook.net/*` route.
- `BILLING_KV` = `eyehold-BILLING_KV` (`c59822282bcf4f1294f4522c7f07a026`).
- Vars `STRIPE_MODE=test`, `EYEHOLD_BASE_DOMAIN`. Secret `EYEHOLD_ACCESS_EMAILS` set to the owner only.
- Access app `eyehold` on `eyehold.babelbook.net`: allow the owner's email, one-time PIN login only. Access app `eyehold-stripe-webhook` on `eyehold.babelbook.net/billing/webhook`: bypass (the Worker accepts only POST there, and only with a valid Stripe signature). `/healthz` is behind Access too.
- Stripe test webhook endpoint `we_1UfotGCPFTRsrZFZUR2k4FFB` ("Eyehold test") on the Babelbook Stripe account (`acct_1USmo1CPFTRsrZFZ`), url `https://eyehold.babelbook.net/billing/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`, livemode false. The Worker does not handle `checkout.session.async_payment_failed`, so that event was not added.
- NOT set yet on the Worker: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. The test key was confirmed (`sk_test_`, `GET /v1/balance` livemode false) and the webhook signing secret was captured at creation, but this environment could not upload secret values through the Cloudflare connector. Until those two secrets are set, checkout returns 503 and every webhook is rejected. Worker version remains 1.

The rest of this runbook is the original plan, kept for reference.

The public host is `eyehold.babelbook.net` on Eyehold's own Worker, named `eyehold`. `services/portal` and `services/billing` are that same Worker: both Wrangler files use `name = "eyehold"` and the portal script. Do not create a second Worker. Do not add a route on `babelbook.net/*`. Do not deploy, rename, or edit the babelbook-staging Worker. Do not point this Worker at Babelbook's Supabase project.

Auth for v1 is a Cloudflare Access email allowlist. The Worker reads `Cf-Access-Authenticated-User-Email` and compares it to `EYEHOLD_ACCESS_EMAILS`. A later Eyehold Supabase project can replace the account key. Babelbook's users are not that project.

## Declared, not applied

`services/portal/wrangler.toml` and `services/billing/wrangler.toml` declare:

```toml
[[routes]]
pattern = "eyehold.babelbook.net"
custom_domain = true
```

`workers_dev` and `preview_urls` are false. That block is configuration only. Wrangler attaches the hostname when someone runs `wrangler deploy`. That command has not been run.

`BILLING_KV` is a placeholder id of zeros. It is not a real namespace.

## Names only

Non-secret vars already in the Wrangler files:

| Name | Value in git |
| --- | --- |
| `EYEHOLD_BASE_DOMAIN` | `eyehold.babelbook.net` |
| `STRIPE_MODE` | `test` |

Secrets. Set with `npx wrangler secret put <NAME>` from `services/portal`. Wrangler asks for the value. Do not write the value into a file that is committed. Do not pass it as a shell argument that lands in history if you can avoid it. `.dev.vars` is gitignored for local `wrangler dev`.

| Name | Required before deploy | What it is |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Test secret. `rk_test_` preferred, `sk_test_` accepted. `sk_live_` and `rk_live_` are rejected by the Worker. |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret of the test-mode endpoint. |
| `EYEHOLD_ACCESS_EMAILS` | yes | Comma-separated Access allowlist. Empty refuses everyone. |
| `EYEHOLD_ACCESS_CLIENT_ID` | no | Access service token id, later, for the desktop updater. |
| `EYEHOLD_ACCESS_CLIENT_SECRET` | no | Access service token secret. Pair with the id. |

Owner shell, not a repo file:

| Name | What it is |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Eyehold's Cloudflare account. Not Babelbook's. |

## Local test, no deploy

From the repo root:

```bash
node scripts/eyehold-purchase-e2e.mjs
```

This runs the portal Worker in-process with a mock Stripe test mode. It creates a Checkout session and a payment link, rejects a bad webhook signature, accepts a signed `checkout.session.completed`, stores the receipt in a local `BILLING_KV`, and asks Treasury Watch to score that receipt. It does not listen on a port and it does not contact Stripe or Cloudflare.

`npx wrangler dev` from `services/portal` is an optional manual preview after the owner has a `.dev.vars` with the three required names. It still does not deploy. Do not pass `--remote`.

## Owner approval

Each step below changes something outside the repo. Do not run it until the owner says yes for that step.

### 1. Cloudflare account — OWNER APPROVAL REQUIRED

Use Eyehold's Cloudflare account. Confirm `npx wrangler whoami` shows that account before any later command. Do not use the account that owns babelbook-staging.

### 2. KV namespace — OWNER APPROVAL REQUIRED

Create a namespace for this Worker. Replace the zero id in both Wrangler files with the real id. Do not invent an id. Deploy with the placeholder still in place will not attach a usable ledger.

```bash
cd services/portal
npx wrangler kv namespace create BILLING_KV
```

Put the printed id in `services/portal/wrangler.toml` and `services/billing/wrangler.toml`.

### 3. Secrets — OWNER APPROVAL REQUIRED

`wrangler secret put` uploads a Worker version. It is a deploy. Do it in the same sitting as step 6, not before the owner has approved deploy. Use a test key and a test webhook secret. If the Stripe endpoint does not exist yet, put a temporary test signing secret, then replace it in step 7 after the endpoint exists.

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put EYEHOLD_ACCESS_EMAILS
```

### 4. DNS and custom domain — OWNER APPROVAL REQUIRED

Approving deploy in step 6 is what creates the custom domain and the DNS record for `eyehold.babelbook.net`. There is no separate DNS command in this repo. Do not add a CNAME or route for any other `babelbook.net` name. Do not edit babelbook-staging.

### 5. Cloudflare Access — OWNER APPROVAL REQUIRED

In the Eyehold account, create an Access application for the self-hosted hostname `eyehold.babelbook.net`.

1. Allow policy: the email list that will also go in `EYEHOLD_ACCESS_EMAILS`.
2. Bypass policy: `POST /billing/webhook` only. Stripe cannot log in. The webhook still requires a valid Stripe signature.
3. Leave the updater service token unset until a signed desktop build exists. `EYEHOLD_UPDATES_ENABLED` stays false.

Do not reuse Babelbook's Access application or its user directory.

### 6. Deploy — OWNER APPROVAL REQUIRED

From `services/portal` only, so the same script is not uploaded twice in one sitting:

```bash
cd services/portal
npx wrangler deploy
```

This uploads the Worker, attaches `eyehold.babelbook.net`, and writes DNS. `services/billing` is the same Worker; a second deploy from that directory is the same upload, not a second host.

After deploy, `GET https://eyehold.babelbook.net/healthz` should return `billingLive: false` and `mode: "test"` with no Access login. Every other path should ask Access to log in.

### 7. Stripe test webhook — owner setup, still test mode

In the Stripe sandbox, add `https://eyehold.babelbook.net/billing/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`. Do not use the live Stripe account for this step.

### 8. Stripe live mode — OWNER APPROVAL REQUIRED

Do not do this as part of the first deploy. The Worker rejects `sk_live_` and `rk_live_` keys and rejects `livemode: true` events. `STRIPE_MODE` stays `test`. `CREDITS.live` and `CLOUD_LIVE` stay false. Switching any of those on is a separate decision after a sandbox webhook has been seen on this host.

## Not in this runbook

No installer is published. The update feed stays an empty platform map. Crowns are not dollars. A receipt Treasury Watch can score is verified USD evidence, not a bank reconciliation.
