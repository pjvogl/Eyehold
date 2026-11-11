# Eyehold hosting

The public host is `eyehold.babelbook.net`. It is a custom domain on Eyehold's own Cloudflare Worker, `services/portal`. `services/billing/wrangler.toml` points at the same script and the same Worker name, so a deploy from either directory is the same Worker, not a second one.

Both Wrangler files declare `pattern = "eyehold.babelbook.net"` with `custom_domain = true`. That declaration is not applied until the owner runs deploy. The steps, and the ones that need approval, are in `docs/DEPLOY.md`.

Do not add a route pattern on `babelbook.net/*`. Do not deploy, rename, or edit the babelbook-staging Worker. Requests whose host is not `eyehold.babelbook.net` are refused, except localhost during tests.

Nothing in this tree has been deployed.

## Cloudflare Access

1. In the Eyehold Cloudflare account, create an Access application for the self-hosted domain `eyehold.babelbook.net`.
2. Add an Allow policy whose include rule is an email list. Those addresses are the v1 users.
3. Put the same addresses in the secret `EYEHOLD_ACCESS_EMAILS`, comma-separated. The Worker checks the `Cf-Access-Authenticated-User-Email` header Access adds after a successful login. An empty list refuses everyone.
4. Add a Bypass policy for `POST /billing/webhook` only, so Stripe can deliver events. That path still requires a valid Stripe signature.
5. For the desktop updater, create an Access service token later and set `EYEHOLD_ACCESS_CLIENT_ID` and `EYEHOLD_ACCESS_CLIENT_SECRET`. The feed stays login-gated until then. `EYEHOLD_UPDATES_ENABLED` remains false.

## Accounts

Each allowlisted email has its own credit balance. The ledger key is `email:` plus that address. When Eyehold has its own Supabase project, replace `accountKey()` so it returns that project's user id. Do not use Babelbook's Supabase project or its users.

## What the Worker serves

| Path | Who |
| --- | --- |
| `/` and `/download` | Allowlisted email. Fantasy landing page. No installer is offered. |
| `/updates/latest.json` | Allowlisted email or a future Access service token. Empty platform map. |
| `/billing/checkout`, `/billing/balance`, `/billing/receipts` | Allowlisted email. Test-mode Stripe only. |
| `/billing/webhook` | Stripe signature. |
| `/healthz` | Public. Reports `billingLive: false`. |

## Still manual

Generate the updater signing key as described in `docs/EYEHOLD_PUBLISHER.md`. Create a real KV namespace before taking a payment. Leave `CREDITS.live` and `CLOUD_LIVE` false until a sandbox webhook has been seen on this host.
