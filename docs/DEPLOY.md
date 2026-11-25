# Eyehold deploy runbook

## Status (2026-11-25, TEST MODE)

Deployed with the owner's approval, Stripe still in test mode:

- Worker `eyehold` (version 1, `4f9f8f94-c453-4640-a036-091ca8bb4731`), workers.dev and preview URLs off, in the Cloudflare account that owns the `babelbook.net` zone (the only account that can attach a custom domain on that zone). babelbook-staging was not changed.
- Workers custom domain `eyehold.babelbook.net` (Cloudflare created its DNS record). No `babelbook.net/*` route.
- `BILLING_KV` = `eyehold-BILLING_KV` (`c59822282bcf4f1294f4522c7f07a026`).
- Vars `STRIPE_MODE=test`, `EYEHOLD_BASE_DOMAIN`. Secret `EYEHOLD_ACCESS_EMAILS` set to the owner only.
- Access app `eyehold` on `eyehold.babelbook.net`: allow the owner's email, one-time PIN login only. Access app `eyehold-stripe-webhook` on `eyehold.babelbook.net/billing/webhook`: bypass (the Worker accepts only POST there, and only with a valid Stripe signature). `/healthz` is behind Access too.
- Stripe test webhook endpoint `we_1UfotGCPFTRsrZFZUR2k4FFB` ("Eyehold test") on the Babelbook Stripe account (`acct_1USmo1CPFTRsrZFZ`), url `https://eyehold.babelbook.net/billing/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`, livemode false. The Worker does not handle `checkout.session.async_payment_failed`, so that event was not added.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set on the Worker (test values only). Current version is 2, `eed2b202-0d6c-4e17-9bfd-13161f083e28` (2026-11-25, 5:48 PM ET). Other bindings are unchanged: `BILLING_KV`, `STRIPE_MODE=test`, `EYEHOLD_BASE_DOMAIN`, `EYEHOLD_ACCESS_EMAILS`.
- A locally signed unpaid `checkout.session.completed` POST to `/billing/webhook` was accepted (`200`, `{ok:true, ignored:true}`). An unsigned POST is still `400 missing-signature`. `/billing/checkout` stays behind Access (unauthenticated POST is `302` to the Access login), so this environment cannot see whether a logged-in spark checkout would still error. A direct Stripe test-mode Checkout Session for the spark pack (`cs_test_a0lSxWSNkYJEBkwvcvOqFciAoxyeM8REOgjTBNDp8LB2bZ97UGXS1QVe6N`, `$5`, `livemode: false`, status `open`) was created only after passing `managed_payments[enabled]=false`. The checkout helper now sends `managed_payments[enabled]=false` on every Checkout Session, including the spark pack, so Managed Payments does not require a product tax code.

## Prepared for live mode (2026-11-25, not deployed)

Tulkas approved switching hosted billing to Stripe live mode. This commit does not deploy, and it does not call Stripe or Cloudflare. The Worker that is already running stays version 2 in test mode until the owner deploys this tree.

In this tree:

- Both Wrangler files set `STRIPE_MODE=live`. With that var, the Worker accepts `sk_live_` or `rk_live_` and `livemode: true` webhook events, and rejects test keys and test events. `STRIPE_MODE=test` keeps the previous guard unchanged.
- `website/site.js` has `CREDITS.live` true. `sidecar/index.js` has `CLOUD_LIVE` true. The hosted site and the app offer the purchase UI.
- `EYEHOLD_UPDATES_ENABLED` stays false. No signed installer is published.
- Checkout still sends `managed_payments[enabled]=false`. Hard caps, signature checks, and replay protection are unchanged.

The live deploy needs these Worker settings. Do not put secret values in git.

| Kind | Name | Value |
| --- | --- | --- |
| var | `STRIPE_MODE` | `live` (already in both Wrangler files) |
| var | `EYEHOLD_BASE_DOMAIN` | `eyehold.babelbook.net` |
| binding | `BILLING_KV` | `c59822282bcf4f1294f4522c7f07a026` (`eyehold-BILLING_KV`) |
| secret | `STRIPE_SECRET_KEY` | Live secret `sk_live_` or live restricted key `rk_live_`. A test key is rejected while `STRIPE_MODE=live`. |
| secret | `STRIPE_WEBHOOK_SECRET` | Signing secret of a new **live** webhook endpoint. The test endpoint's secret will not verify live events. |
| secret | `EYEHOLD_ACCESS_EMAILS` | Owner allowlist. Already set; leave it. |

Create the live webhook in the Stripe live account, not the test endpoint `we_1UfotGCPFTRsrZFZUR2k4FFB`. URL `https://eyehold.babelbook.net/billing/webhook`. Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Do not subscribe `checkout.session.async_payment_failed`. The Worker does not handle that event.

Replace the two Stripe secrets before or with the deploy. Until `STRIPE_SECRET_KEY` is a live key, checkout returns 503. Until `STRIPE_WEBHOOK_SECRET` is the live endpoint's signing secret, every live webhook is rejected.

The rest of this runbook is the original plan, kept for reference. Section 8 below is the live switch the owner approved.

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
| `STRIPE_MODE` | `live` |

Secrets. Set with `npx wrangler secret put <NAME>` from `services/portal`. Wrangler asks for the value. Do not write the value into a file that is committed. Do not pass it as a shell argument that lands in history if you can avoid it. `.dev.vars` is gitignored for local `wrangler dev`.

| Name | Required before deploy | What it is |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Live secret `sk_live_` or live restricted key `rk_live_` while `STRIPE_MODE=live`. Test keys are rejected in that mode. `STRIPE_MODE=test` still accepts only `rk_test_` or `sk_test_`. |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret of the webhook endpoint for the same mode. Live events need the live endpoint's secret. |
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

After a deploy of this tree, `GET https://eyehold.babelbook.net/healthz` should return `billingLive: true` and `mode: "live"`. The test-mode deploy reported `billingLive: false` and `mode: "test"`. Every other path should ask Access to log in.

### 7. Stripe test webhook — owner setup, still test mode

In the Stripe sandbox, add `https://eyehold.babelbook.net/billing/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`. Do not use the live Stripe account for this step.

### 8. Stripe live mode — approved, not yet deployed

Tulkas approved this switch. The tree is prepared and has not been deployed from this commit.

1. In the Stripe **live** account, add `https://eyehold.babelbook.net/billing/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Do not add `checkout.session.async_payment_failed`.
2. `npx wrangler secret put STRIPE_SECRET_KEY` with `sk_live_` or `rk_live_`. `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with that live endpoint's signing secret. Do not write either value into the repo.
3. Confirm both Wrangler files still say `STRIPE_MODE = "live"` and `EYEHOLD_BASE_DOMAIN = "eyehold.babelbook.net"`, and `BILLING_KV` is `c59822282bcf4f1294f4522c7f07a026`.
4. Deploy from `services/portal` only after those secrets are set. `GET /healthz` should then report `billingLive: true` and `mode: "live"`.

`STRIPE_MODE=test` remains the mirror: test keys and `livemode: false` events only. `EYEHOLD_UPDATES_ENABLED` stays false.

## Not in this runbook

No installer is published. The update feed stays an empty platform map. Crowns are not dollars. A receipt Treasury Watch can score is verified USD evidence, not a bank reconciliation.
