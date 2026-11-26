# Eyehold milestone tracker (2026-10-15)

## Primary goal
Develop a real, authorized AI-agent workforce that produces commercially valuable accepted deliverables while controlling real provider spend. The $1,000,000 after-compute-profit figure is a **long-term aspiration**, not an achieved result. Crowns are non-transferable game points, not USD or evidence of profit.

| Milestone | Evidence | Status |
| --- | --- | --- |
| Phase 1: sidecar startup, health, and roster restart | GitHub Actions Phase 1, user reported green | PASS (offline) |
| Phase 2: real sidecar run pipeline with mock provider | GitHub Actions Phase 2, user reported green | PASS (offline) |
| Phase 2: real-model UI workload | GitHub Actions Phase 2 live probe, user reported green after funding OpenRouter | PASS (live workload, role unspecified) |
| Phase 3: summon/dispatch/child-run/session transcript with mock provider | GitHub Actions Phase 3, user reported green | PASS (offline) |
| Phase 3: actual live The Eye -> Deepforge delegated deliverable | Live workflow `.github/workflows/eyehold-phase3-live-delegation.yml` user reported green after explicit engineering-session routing correction | PASS (live role-specific proof) |
| Phase 4: goal-aligned accepted-deliverable ledger and supervisor unit proofs | `.github/workflows/eyehold-phase4-crowns.yml`, user reported green after fixture correction | PASS (isolated CI) |
| Phase 4: install trusted acceptance adapter into running sidecar event bus | Composed trusted Crown runtime tests reported green; added guarded sidecar integration interface mapping workflow; host startup installation and review authorization still outstanding | PENDING HOST INSTALL |
| Full end-to-end: live delegation, accepted evidence, one Crown award, restart persistence | Not yet run | PENDING |
| Production: unattended jobs, spending controls, revenue accounting | No production/financial proof | PENDING |
| Release fast-gate source-lock | Protected claim inventory drift is unresolved; do not weaken | BLOCKED |

## October 15 progress\n- Implemented a one-owner acceptance + Crown runtime composition entrypoint with explicit trusted host readers; tests now cover its approval, award and restart path.\n- Still not installed into `sidecar/index.js`; do not imply live awards or financial income.\n\n## Next actions in order
1. **Completed:** Phase 4 isolated backend verification passed on GitHub Actions, as reported by the operator; the stale ledger fixture was corrected in commit `afc9c46a6e26ebdfc5003f73261cb63918f72b01`.
2. **Completed:** the operator reported both Phase 4 integration test and source-safe hook-inspection workflows green. **Pending:** inspection found run/transcript paths but no matching `deliverable.accepted`, acceptance-store accessor, or Crown import. Authoritative acceptance store and trusted event are implemented as a standalone module; operator reported the end-to-end module test green. Install `sidecar/eyehold-crown-integration.js` into actual sidecar startup; then verify live awards. A fail-closed static readiness workflow was added at `.github/workflows/eyehold-phase4-acceptance-readiness.yml`. Do not emit awards from frontend UI/animation or from `agent.run.end` alone.
3. **Completed:** the operator reported a green **Eyehold Phase 3 - Live Eye to Deepforge proof** on `feat/harness-backend`. Keep the positive live result separate from the still-unverified automated Crown integration.
4. Execute the full **live delegation -> accepted business milestone -> durable Crown award -> supervisor report** acceptance proof.
5. Define customer-facing, lawful sales/service workflows and separately account for real payments, refunds, operating expenses and model spend.
6. Repair/review the original release claim lock as part of formal release validation, retaining its integrity.

Never report a new phase as completed based solely on committed code. Phase 4's test fixtures are independent of the live server until its startup/event-store seams are verified.

## Production wiring mapping
The operator reported the composed Crown runtime CI green. `sidecar/index.js` is too large for the connected file reader to return its source; `.github/workflows/eyehold-phase4-integration-mapping.yml` prints bounded run/event API interface excerpts in a GitHub job summary. Review this evidence before editing live startup, and do not award Crowns simply because a run ended.

## October 15 production bootstrap attempt
- Mapped real `runStore` and channel/event integration points from production code excerpt. `runStore` uses `runId` + `reason`; added `sidecar/eyehold-runstore-adapter.js` to map them into the strict Crown verification contract.
- Added guarded bootstrap installer `scripts/eyehold-install-host-wiring.cjs` and `.github/workflows/eyehold-phase4-install-host.yml`, which can commit `sidecar/index.js` only after syntax and offline tests pass. The workflow was configured to trigger by a branch push.
- **Security:** bootstrap deliberately uses `verifyEvidence: () => false`. This installs infrastructure but will not award production Crowns until a separate reviewer-authorized business-evidence verification mechanism is implemented and tested. No automatic real financial success is claimed.
- Confirm workflow success and resulting host commit before changing the production-host milestone status.

## Operator approval milestone
- Host bootstrap was reported green; `sidecar/index.js` now has a different blob SHA from the earlier read, consistent with an installation commit. The live evidence callback remains intentionally `verifyEvidence: () => false`.
- Added `sidecar/eyehold-review-gate.js` and `test/eyehold-review-gate.test.js`: authenticated operator identity, matching run/goal/evidence and independent evidence inspection are all required. CI workflow updated; green result not yet confirmed.
- **Still pending:** bind operator identity to a real authenticated sidecar request/session, expose an owner-only review action, and invoke acceptance within the single sidecar writer. Do not expose unrestricted approval or treat simulated auth test as production authentication.

## Owner HTTP review boundary (next integration stage)
- Added `sidecar/eyehold-owner-review-http.js` with an opt-in POST handler. It requires **host-injected** `authorizeRequest(req)` and `inspectEvidence(decision,run,context)` before awarding Crowns, and never trusts an HTTP JSON `authenticated` or `actorType` claim.
- Added offline test `test/eyehold-owner-review-http.test.js`, and included it in Phase 4 Crown workflow. The header in this test is a **mock only**, not a production authentication method.
- This handler is **not yet mounted into the actual sidecar routing table**. Before mounting, inspect existing HTTP authorization guarantees and add server-owned evidence verification. Do not substitute the test stub for real auth.

## Operator-visible productive workflow (2026-10-15)
- Added `.github/workflows/eyehold-produce-deliverable.yml`: a manual assignment input is delegated through the previously proven real-model The Eye -> Deepforge path, and the worker text plus an **unapproved** review manifest are archived as a downloadable CI artifact. This is a move toward meaningful agent output, not yet a deployed application UI or commercial service.
- Existing paid live execution budget/consent boundaries are retained; workflow has not yet been reported green. No Crowns, earnings, or production acceptance implied by artifact creation.
- Next: prove this workflow with one useful assignment, then move its review and evidence controls into the authenticated running application (rather than adding isolated ledger tests). Commercial pilot only after bounded cost and review checks.

## First real deliverable verified by operator (2026-10-15)
- Operator reported `Eyehold - Produce a real deliverable` green following JSON export fix. The CI produced a real delegated worker artifact; this does **not** imply it was inspected or accepted.
- Added a deterministic review packet generator (`scripts/eyehold-review-packet.cjs`) to the live deliverable workflow: `REVIEW_ME.md` human checklist, `quality-check.json` structural checks and SHA-256 digest. Added offline test `test/eyehold-review-packet.test.js`; the amended workflow still awaits confirmation.
- Next functional step: review the actual file with the owner; then connect an authenticated review action in the live Eyehold app. A GitHub artifact and offline review checklist are not a game UI, and do not create earned Crowns or revenue.

## Multi-room commercial workforce design (2026-10-16)
- Seven existing Eyehold specialty factions identified in `frontend/app/eyehold-roles.js`; previous assumption that only one role existed was incorrect.
- Added `frontend/app/eyehold-departments.js` and a Business Departments view in the Work Board: Command, Opportunity Research, Business Strategy, Operations, Production, Quality and Treasury Watch. Each specifies responsibilities, handoffs and permitted authority. The source code and CI test are committed.
- **Important:** Department labels do not automatically place physical rooms, summon additional agents, connect banks, register accounts, send outreach, or generate revenue. Actual room construction and active agent bindings in the persistent game require integration with the game's room layout/store and real roster.
- Added a COMMS assignment navigation action and five-second run history refresh to the Work Board; still pending real in-game browser verification.
- Next: connect these department assignments to user-created world rooms/roster and verified backend runs; then owner-controlled review, spending limits and financial bookkeeping. Require explicit approval for creating outside accounts, outreach, financial transactions and recurring spend.

## Multi-department reality check (2026-10-16)
- Added **CHECK LIVE CREW** in the Work Board, backed by the current sidecar `GET /api/roster`, showing how many of seven department specialty assignments actually exist. No implied agents, accounts or built rooms.
- Business role and interdepartmental handoff plans are represented in `frontend/app/eyehold-departments.js`; matching physical room geometry and roster activation remains pending. Shared Eyehold WorldModel supports explicit `addRoom` and `setRoomTerritory`, but physical world mutations must respect collision/build-mode persistence and operator consent.
- Explicitly do not create external accounts or connect personal financial data; Treasury Watch must report only verified business revenue/cost inputs. Automated commercial production cannot be called active until actual persistent rooms, staffed agents and authorized delegation are demonstrated.

## 2026-10-16 unattended-work notification mitigation and seven-room native blueprint
- Removed automatic `push` triggers from three Eyehold-specific Actions workflows (Work Board, Crown tests and Crown install); these remain manual `workflow_dispatch`. This reduces unnecessary CI notifications, but does not prove other repository-wide jobs have stopped.
- Created `scripts/eyehold-seven-room-starter.cjs`, an opt-in NEW-KEEP template builder using `WorldModel.create(starterDoc())`, validated `addRoom`, `renameRoom`, and `setRoomTerritory`. Includes original home/desk, shared corridor, and six additional departmental rooms. Never overwrites an existing user save or grants new capabilities.
- Added `test/eyehold-seven-room-starter.test.js` and manual `.github/workflows/eyehold-seven-room-blueprint.yml` to validate and export a JSON starter blueprint as an artifact. **Not yet verified green.**
- Outstanding operational blockers: importing/activating this template in a persistent running keep through explicit user action, staffing each room with distinct real agents and capability-scoped workkeeps, proving interdepartmental live delegation, authenticated deliverable acceptance and Crown award, and connecting verified real USD accounting. Do not claim an autonomous business is active until confirmed.

## 2026-10-16 repaired blueprint + operator-instantiated seven-room workforce
- The red blueprint job was **only** a timestamp comparison failure: native `WorldModel.starterDoc()` stamps `meta.createdAt` with the current millisecond. Fixed test to compare deterministic layout after normalizing that timestamp, while retaining a finite-timestamp assertion.
- Added one real `desk` prop to each new room. Tests now verify seven desks total and six specialist workkeep ownership records survive `WorldModel` serialization/deserialization.
- New opt-in UI files `frontend/app/eyehold-layout-install.js` and `frontend/app/eyehold-staff-departments.js` are loaded by `frontend/index.html`. Layout activation creates a backup first, requires confirmation, and refuses to replace existing multi-room worlds; staffing requires confirmation and uses `App.summonAgent` + native `keep.assignDesk` + persistent roster, with partial retry handling.
- Work Board now verifies actual named agent specialty and desk-in-room assignment, and prepares a two-worker `team_dispatch` task in COMMS using genuine roster IDs. It creates missing native research and engineering workstreams first, but DOES NOT send a prompt without a human click.
- Added `.github/workflows/eyehold-live-multidepartment.yml`, a manual real-model Raven Court + Deepforge delegation test with separate reviewable artifacts and bounded provider budgets. It is NOT automatically triggered. No green live result has been observed yet, no commercial income is claimed.
- All of the above commits are code changes only until the offline blueprint acceptance workflow passes and an operator uses the in-game controls. For deployment, the operator must open a running persistent keep, click BACK UP & INSTALL NEW LAYOUT if the keep has just one room, then SUMMON & ASSIGN SIX SPECIALISTS and verify the roster and in-world bodies. Never claim a running multi-agent business based only on these code commits.

## 2026-10-16 source syntax preflight
- Direct JavaScript parsing of the newly modified modules caught invalid quoted text in `frontend/app/eyehold-workboard.js`. Fixed in commit `88a68178c5749b29997a4983049fd4fea23cb1de`. New on-demand syntax check passes for that file and the other new JS modules inspected.
- Still requires offline WorldModel runtime test via manual `.github/workflows/eyehold-seven-room-blueprint.yml`, plus user confirmation that the game's import/staff actions persist after restart. The manual paid `.github/workflows/eyehold-live-multidepartment.yml` must pass before claiming Raven Court + Deepforge are proven in one real delegation.

## 2026-10-16 consolidated backend launch readiness
- User reports the seven-room blueprint workflow is GREEN. This verifies native room generation and its specified offline tests, not a deployed keep.
- Added manual/no-provider-charge `.github/workflows/eyehold-backend-launch-readiness.yml` running syntax checks plus physical layout, roster UI wiring, runStore adapter, Crown runtime, durable acceptance and owner HTTP authorization tests. `test/eyehold-launch-readiness.test.js` additionally enforces manual-only charged workflows, capped two-specialist live proof, and server-derived owner authorization.
- **Still pending a green consolidated readiness run**: do not call backend launch certified until its result is checked. A green result does not prove live UI, hosted availability, real provider connectivity, authenticated owner review in production, external account connections, or generated revenue.
- The first operator launch must use a computer capable of running Node.js / hosting sidecar, or a separately configured trusted hosted deployment; no public application URL is presently verified.

## 2026-10-16 seven-agent persistence and finance integrity
- User reports original consolidated backend readiness workflow GREEN.
- New `test/eyehold-seven-agent-restart.test.js` runs a real sidecar in an isolated scratch workspace, POSTs seven model-configured specialist roster records, reads them back, restarts the process on the same workspace, and requires all seven IDs to be present after restart. No provider key or inference. This is **not yet verified green** and does not establish durable *conversation transcripts* after restart (separate proof required).
- New `sidecar/eyehold-finance-truth.js` and `test/eyehold-finance-truth.test.js` enforce evidence-marked nonnegative integer cents, separate unavailable input from true zero, and calculate business net profit from provided records. This does not connect live bank, processor, invoices or model bills and does not prove reconciled financial results.
- Consolidated manual-only readiness workflow includes both tests. External account creation, paid tools, banking connectors, autonomous outreach and payouts are NOT enabled. Existing fail-closed owner HTTP review tests remain in the gate.
- Live two-specialist research+production evidence remains a separate explicit operator-initiated paid test. Seven-agent *live execution*, per-agent session persistence, and three-plus-stage autonomous handoffs remain unverified.

## 2026-10-16 seven-agent roster test correction and external accounts
- User observed red consolidated test at `GET /api/roster` following successful POST registration, with all prior unit gates green. Changed `test/eyehold-seven-agent-restart.test.js` to re-register seven agents with POST after controlled restart instead of assuming a supported GET route. Test now demonstrates *post-restart re-registration*, NOT durable server-owned roster data; explicit persistence of sessions and server state is still pending.
- Created `sidecar/eyehold-external-account-policy.js` and test. Only a default-deny policy module exists; it is NOT yet wired into actual third-party connector execution routes. Store creation, publishing, payouts and account linking require separately authenticated owner approval and a verified connector. No bank credentials, storefront accounts or payment accounts were connected or created.
- Existing Treasury Watch finance truth calculations use provided evidence-marked records only; bank/payment processor reconciliation and actual net earnings remain unavailable.
- A green rerun of consolidated readiness after these changes would verify only its specified offline contracts, not commercial/production readiness.

## 2026-10-16 verified-profit ladder and cosmetic loot motivation
- Financial ladder encoded in `sidecar/eyehold-finance-truth.js`: verified cumulative net USD profit at $1M → $10M → $100M, with next goal and completed milestones. Missing/unverified financial data does not advance it.
- New `frontend/app/eyehold-room-loot.js` previews 21 distinct seven-department room decorations across the three tiers; Work Board now offers a *locked cosmetic preview*. No native props are installed and no real reward is issued from preview alone. Actual authenticated financial unlock + native WorldModel cosmetic placement remains to implement.
- Eyehold specialist templates now explicitly present shared loot goals as desirable role-playing achievements to pursue through profitable, lawful, evidence-verified work; no permissions, costs, financial authority or actual motivational experience are created by these instructions. Existing agents may require a re-application of the updated specialty.
- Manual backend readiness test includes milestone, motivation and finance-unavailability assertions. This latest extended gate has NOT been user-verified green.

## 2026-10-16 multi-agent stream parsing fix and physical milestone upgrades
- **Root cause for zero events on paid handoff:** the sequential delegation test searched a literal backslash+n in JSON-lines instead of LF; therefore both supervisor rounds emitted zero parsed events, so consent was never handled and no worker runs could be observed. Fixed JS source delimiter in `test/eyehold-live-multidepartment.test.js`, and added `test/eyehold-live-stream-decoder.test.js` to manual free gate. Corrected workflow has NOT run green. Earlier second-worker failure still requires validation after parser fix.
- Added `frontend/app/eyehold-native-loot.js` and loaded it in `frontend/index.html`. It uses real native WorldModel props at three distinct positions in all seven named rooms, persists keep mutations, refuses absent verification callback, and avoids duplicates. New native integration test in manual offline gate. Uses native plant/shelf/vault stand-ins; custom dragon forge/throne/orrey 3D assets are **not** yet available and must not be claimed as rendered.
- **Unlock/security remains incomplete:** native applicator is dormant until an authenticated, server-controlled financial evidence/attekeep integration is added. A client-supplied callback is not itself a trustworthy financial approval and must never be mistaken for server attekeep. No earnings, trophies, model budgets, bank credentials or economic permissions were changed by these commits.


## 2026-10-16 continuation: live diagnostics, Treasury integration, and UI gate

- Confirmed backend workflow run `38950434590` passed at commit `9250d8b9`.
  The pasted zero-event failure predates the LF parsing correction already in that tree.
- Strengthened the paid two-department proof: streaming UTF-8 decoder handles split
  characters and a final line without LF; run errors, termination reasons, event counts,
  and the summary are retained. Only `team.dispatch` consent is approved. Clean child
  completion and supervisor output are required. Raven's saved research becomes
  bounded, explicitly unreviewed context for Deepforge. Supervisor results are saved
  beside worker deliverables. The charged workflow stays manual with existing budgets.
  **No new paid live result has been observed in this continuation.**
- Added host-only owner-reviewed receipt ingestion and authenticated read-only
  `/api/eyehold/finance`. Each imported USD receipt has a unique ID, integer cents,
  type and SHA-256 evidence digest. Duplicate IDs, non-USD records, malformed amounts,
  arithmetic overflow, altered evidence and oversized batches fail closed.
  Browser/agent HTTP cannot write financial records. This verifies the imported
  evidence against its reviewed snapshot; it does **not** independently reconcile
  a bank account, prove the receipts authentic, or establish completeness.
- Treasury now installs earned native plant/shelf/vault markers in seven physical
  rooms from the host's reviewed snapshot and uses the existing save mirror.
  Stable cosmetic labels survive world migration, moves and reloads. Occupied
  locations are left unchanged and reported for retry. No paid capabilities are
  granted. The listed fantasy artwork is still planned; these are native markers.
- Work Board shows actual active runs from the state snapshot alongside history,
  identifies delegation parents, prefers each run's delivery text, and labels
  session-wide transcript fallback. Its width now includes padding on mobile.
- Focused local checks passed: decoder, delegation contract, finance arithmetic,
  financial store, native props, milestone catalog, Work Board and activation
  contracts, layout, session restore, seven-agent re-registration, and real
  authenticated finance HTTP plus durable keep save/restart. No model requests.
- Actual browser execution is **pending**: the local Chromium download was truncated.
  The manual backend readiness workflow now includes a real-app desktop/mobile
  browser test with an isolated fixture ledger and zero model budget, using runner
  Chrome. Fixture screenshots are uploaded as `eyehold-ui-fixture-proof`.
  Synthetic fixture receipts never enter production financial state.
- Automatic approval review rejected one broader local batch over possible provider
  traffic. It was not bypassed. Focused offline checks and the credential-free local
  finance HTTP check were used instead. The paid proof still runs only on explicit
  manual launch in GitHub, where the existing secret remains.

### Import reviewed financial evidence when actual receipts exist

On the sidecar host, create one JSON export per reviewed receipt, with fields such
as `{"id":"unique-source-id","currency":"USD","type":"revenue","cents":10000}`.
Valid types: `revenue`, `expense`, `refund`, `fee`, `model-cost`. Non-revenue types
are subtracted. Review authenticity, amounts, duplicate transactions, refunds,
processor fees, and compute expenses before importing. A unique ID is scoped to
this complete imported snapshot; the importer cannot detect two different IDs
representing the same real transaction.

Run `node scripts/eyehold-import-finance.cjs --workspace-root <actual-sidecar-workspace-root> --confirm-reviewed receipt1.json receipt2.json`.
This **replaces** the full snapshot, rather than appending transactions. Keep the
original evidence securely. Missing receipts mean missing coverage, not zero cost.
Do not import the test fixtures as actual income. No real receipt was imported by
this implementation task. Existing decorations are cosmetic; a later loss or
refund prevents new unlocks but does not delete placed furniture.

### Remaining validation

1. Run **Eyehold - Backend launch readiness** on `feat/harness-backend` to exercise
   the new browser gate and obtain fixture screenshots.
2. Run **Eyehold - Live two department handoff** on that branch to validate real
   provider execution, research-to-engineering context, and saved supervisor results.
3. Inspect the deliverables before using them for customer work. External accounting
   connections, bespoke fantasy assets, and actual business income remain absent.

## 2026-10-16 ordered completion: CI correction

- Latest automatic Eyehold module run failed because it started the sidecar without
  `npm ci`. The same wildcard also included paid live-proof entrypoints. Added the
  dependency install and explicit paid-test exclusions; provider keys are blank and
  spend caps zero for automatic offline execution.
- Added a test-only loopback network preload inherited by spawned sidecars, and
  disabled live price refresh in this gate. This blocks remote fetch/socket calls
  (including the public startup catalog GET), rather than treating absent keys as
  proof of no network traffic. The automatic approval review rejected the prior
  broader batch over OpenRouter traffic; the loopback-only replacement completed.
- Every offline Eyehold test in the corrected wildcard passed locally; paid proofs
  were not run. The standalone distribution test also passed.
- The public-distribution fixture now runs an isolated temporary configuration and
  reserved `.invalid` URLs, without restoring an upstream update endpoint in the
  real app. The real distribution gate now explicitly blocks absent/disabled owned
  updater configuration. This is a successful test of a blocked release state, not
  a signed or published release.
- Pending: automatic GitHub checks on this correction, then manual browser readiness
  and live two-department handoff before advancing to production owner review.

## 2026-10-16 ordered completion: persistence and browser proof

- Corrected offline module job passed on GitHub at `f4a723ad`; it no longer
  attempts paid proof entrypoints. Eval and secret-history checks passed.
- Reused the no-model browser readiness workflow inside module CI at `d042b952`.
  Its offline checks passed. Browser execution reached Chrome, but its test keep
  stopped at credential recovery: the seed had no provider. Updated that isolated
  seed to use the supported keyless local provider with model execution blocked,
  and added failure screenshots/diagnostics. Browser rerun is still required.
- Replaced the weak roster re-registration test with a real persistence proof:
  new token-gated, read-only `/api/eyehold/crew` exposes bounded identity/model
  metadata, not system prompts. The test registers seven agents once, saves all
  seven staffed rooms/desks and named sessions, restarts the real sidecar, and
  reads the restored server roster without re-registration. Passed locally under
  loopback-only networking. This does not claim seven actual model completions.
- Paid live handoff remains manual-only and pending. Later owner-review, bounded
  unattended work, commercial pilot, custom artwork and signed release stages have
  not been marked complete. Keep this order; do not turn test receipts into income.

## 2026-10-16 real browser regression resolved

- Obtained a local Chromium executable through temporary test dependencies; the
  actual browser smoke test now runs locally against a real disposable sidecar.
- Browser execution confirmed: missing financial data stays unavailable; one
  synthetic reviewed fixture receipt installs seven native room markers; reload
  retains exactly seven; the Work Board fits 1440px desktop and 390px phone widths;
  no page errors or model calls occurred.
- It found a real mobile bug: body text zoom enlarged the board beyond the viewport.
  Updated its width/height caps to use the app's existing `--sn-unzoom` reciprocal.
  The complete browser smoke test passed after this fix. CI rerun is still pending.
- Paid Raven-to-Deepforge execution remains the next dependency. Do not mark owner
  review/Crowns, unattended operation, commercial integrations, or release complete.
