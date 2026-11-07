# Eyehold milestone leftovers

This fork's visible product name is Eyehold. The strings below still say StarNet on purpose.

## Kept

| Leftover | Why |
| --- | --- |
| MIT notice that the StarNet name, logo, and station sheets are not licensed | Required reservation from the upstream README. This fork must not ship as StarNet. |
| `starnet.save`, `STARNET_*`, `X-StarNet-Token`, `ai.skynet.harness` | Existing stations, keychain entries, and desktop identity. New UI writes do not rename those stores in this milestone. |
| `starnet-skill-registry/v1`, `StarNet Skill Market`, `StarNet skill package`, `website/skills/**`, `website/.well-known/starnet-skills*.json` | Signed, hash-pinned catalog. Rewriting the name changes the bytes and the signature cannot be reissued here. |
| `https://starnetos.com` canonical tags | The website tests and sitemap still publish that host. It is not an Eyehold domain. The owner must replace it before a public site. |
| `github.com/pjvogl/starnet` and `github.com/androoAGI/starnet` | This GitHub repository was not renamed. Community links that still name the upstream source repo are called out here. |
| `frontend/assets/**` industrial sheets and character sprite sheets | Upstream station art. Not replaced in this milestone. The default ground, splash, wordmark, and crew sprites are original. |
| Filename `starnet-wordmark.svg` | The mask contract still loads that path. The path data is a new pixel wordmark, not the traced StarNet logo. |
| `qa/product-perfect/claims.json` authority text | The claims lock compares the committed ledger. It was not rewritten. |

## Stopped in this milestone

- Managed-credit linking is off (`CLOUD_LIVE` is false). The app does not offer the upstream account.
- Website buy buttons are off (`CREDITS.live` is false) and the account URL is empty.
- The site does not call `api.github.com` for `androoAGI/starnet-releases`. Download buttons stay on this site.
- The phone relay does not dial `remote.starnetos.com` unless `EYEHOLD_REMOTE_RELAY` is set (`REMOTE_RELAY_LIVE` is false).
- Tauri updater endpoints were already empty. They stay empty.
- Packaged-lifecycle and clean-install workflows no longer default to the upstream release repository. A dispatch must name the owner's repository.
- The model picker does not open `starnetos.com/pricing`.

## Monetization

Defined goals, from the repo, not from a live ledger:

1. Long-term aspiration: $1,000,000 after-compute profit, then the coded ladder at $10,000,000 and $100,000,000 in `sidecar/eyehold-finance-truth.js`. Missing evidence does not advance the ladder.
2. Crowns: non-transferable points for owner-accepted deliverables. They are not dollars and do not grant tools.
3. Optional managed credits: the upstream StarNet Credits program. This fork must not resell it.

Gap: no reviewed receipts, no bank reconciliation, no owned billing host, and no signed release. Do not describe profit, credits, or a subscription as ready. Bring-your-own-key remains the working path.

## Still to do

- Replace the industrial prop and crew sprite sheets with original art, or stop shipping them.
- Replace every remaining user-facing StarNet string outside the signed catalog and the license reservation.
- Point the website canonical host, skill catalog, and community links at domains the owner controls.
- Provision owner review on a real station, then record accepted work before any Crown or profit claim.
- Add an owned publisher, signing identity, and update feed before distribution.
