# Eyehold deploy runbook

## Status (2026-11-25, LIVE MODE)

Deployed with the owner's approval, Stripe live mode, Babelbook account `acct_1USmo1CPFTRsrZFZ`:

- Worker `eyehold` current version is 6, `bf1be549-2868-4138-b981-12930ba4bfc2` (2026-11-25, 6:32 PM ET). workers.dev and preview URLs are off. babelbook-staging was not changed. The custom domain `eyehold.babelbook.net` is unchanged. No other DNS or `babelbook.net/*` routes were added.
- `BILLING_KV` = `eyehold-BILLING_KV` (`c59822282bcf4f1294f4522c7f07a026`).
- Vars `STRIPE_MODE=live`, `EYEHOLD_BASE_DOMAIN`. Secret `EYEHOLD_ACCESS_EMAILS` remains the owner only. Access apps and the allowlist were not changed.
- Live webhook endpoint `we_1Ufpg8CPFTRsrZFZy50zyi5L` ("Eyehold live") on the Babelbook Stripe account, url `https://eyehold.babelbook.net/billing/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`, livemode true. The test endpoint `we_1UfotGCPFTRsrZFZUR2k4FFB` was left in place and was not modified.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the Worker are the live key and the live endpoint's signing secret. Versions 4 and 5 were the secret uploads; version 6 is the live-mode code from `d33628c2`.
- `website/site.js` has `CREDITS.live` true. `sidecar/index.js` has `CLOUD_LIVE` true. `EYEHOLD_UPDATES_ENABLED` stays false. No signed installer is published.
- Verification on version 6: `GET /` returned `302` to the Access login. An unsigned `POST /billing/webhook` returned `400 missing-signature`. A locally signed unpaid `checkout.session.completed` event with `livemode: true` returned `200` `{ok:true, ignored:true}`. A live spark Checkout Session `cs_live_agPxjPXugKJZTiHqlw9ym2BK1hC7vANv5N1bo4YGxBtWpn2etHHlIOg6Bp` was created (`$5`, `livemode: true`, status `open`, unpaid) and expired immediately (`200`, status `expired`, still unpaid). No charge was made.

The rest of this runbook is the original plan, kept for reference. Section 8 below is the live switch the owner approved.

## Skill catalog signing key

The Skill Market catalog is `eyehold-skill-registry/v1` at `https://eyehold.babelbook.net/.well-known/eyehold-skills.json`. The app trusts the public key `eyehold-market-2026-a` in `sidecar/skills/market-signing.js`. The matching private key is not in git. Keep the PEM outside the repository and point `EYEHOLD_SKILL_MARKET_KEY` at that file when rebuilding the catalog. A backup private key stays offline the same way. Do not put either PEM in a Worker var, a commit, or a log.

## Agent readiness

The keep can walk a venture from research to a reviewed listing, a verified receipt, Crowns, and a capped reinvestment without an owner click. A local run of that loop used a mock Stripe and made no charge. These accounts are still required before an agent can do the real-world step. None of these values belong in git.

| What the agent is trying to do | What is missing | Where it plugs in |
| --- | --- | --- |
| Ask a model for research, a draft, or a quality check | An AI model API key for the keep that runs the agents. The hosted Worker does not call a model. The cycle calls whatever `tools.briefs`, `tools.findings`, `tools.produce`, and `tools.review` the keep passes in. | `sidecar/eyehold-cycle.js` tool arguments. The keep's existing provider key is the credential. There is no model key on the Worker. |
| Search the live web for sources | A search or research API key, if the model is not allowed to browse. Without it, briefs only exist when the tool returns sources. The cycle does not invent citations. | The same `tools.briefs` and `tools.findings` functions. |
| Create a Stripe Payment Link in live mode | Already set on the Worker: `STRIPE_SECRET_KEY` (live) and `STRIPE_WEBHOOK_SECRET` (live endpoint `we_1Ufpg8CPFTRsrZFZy50zyi5L`). The keep cycle needs that same live key in memory when it publishes. It sends `managed_payments[enabled]=false`. A test key is rejected in live mode. | `stripePaymentLinkAdapter({ mode: 'live' })` in `sidecar/eyehold-market-channels.js`, called with `stripe.secret` from `sidecar/eyehold-cycle.js`. Webhook events remain `checkout.session.completed` and `checkout.session.async_payment_succeeded`. |
| List on Etsy | An Etsy app, a keystring, and the shop's OAuth token. `ETSY_API_KEY` is read and then refused. The adapter does not call Etsy. | `sidecar/eyehold-etsy.js`, `etsyListingAdapter`. The cycle records `etsy: not-connected` and still uses the Stripe link for the sale. |
| Send email or a customer message | A mailbox and a sending provider. No venture tool is allowed to message a customer. `contactCustomer` is rejected. | A future mail tool would be added to `sidecar/eyehold-tools.js` for a venture and called from the cycle. There is no hook that sends mail today. |
| Trade with real money | A brokerage account and API key. Do not add one for this loop. Paper fills stay paper, graduation still waits for the owner, and `liveOrder` throws. | `sidecar/eyehold-trader.js`, `createBrokerAdapter`. Practice points only. Crowns stay off this path. |
| Spend more than the team has earned | Nothing to connect. The owner can still top up by hand. Agent reinvestment cannot exceed verified earnings or the venture cap. | `allocateFromEarnings` and `releaseWithinCap` in `sidecar/eyehold-treasury.js`. |

Restart persistence is the cycle file plus the research, venture, desk, market, treasury, score, and finance files. Three failures on the same step stop that run instead of looping forever.

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
