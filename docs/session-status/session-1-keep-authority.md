# Session 1 - Keep Authority

## Current slice

HELD-FOR-COORDINATION on the HTTP integration slice. The next unmet Session 1 items are `/api/keep` acceptance/persistence and `/api/run` ignoring forged `body.placed`, both of which require `sidecar/index.js`. That file is still contended as of 2026-06-26T21:59Z, so no source edits were made in this loop.

## Changed files

- `sidecar/keep-store.js`
- `sidecar/routing/router.js`
- `frontend/app/worldmodel.js`
- `test/keep-authority.test.js`
- `test/routing.b5.test.js`
- `docs/session-status/session-1-keep-authority.md`
- 2026-06-26T10:52Z loop only updated `docs/session-status/session-1-keep-authority.md`.
- 2026-06-26T17:56Z loop only updated `docs/session-status/session-1-keep-authority.md`.
- 2026-06-26T18:56Z loop only updated `docs/session-status/session-1-keep-authority.md`.
- 2026-06-26T19:57Z loop only updated `docs/session-status/session-1-keep-authority.md`.
- 2026-06-26T20:58Z loop only updated `docs/session-status/session-1-keep-authority.md`.
- 2026-06-26T21:59Z loop only updated `docs/session-status/session-1-keep-authority.md`.

## Evidence

- Added a routing test proving forged legacy plan objects (`cabinet`, `workbench`) cannot grant files or shell when an authoritative Keep document is installed.
- Added a transactional test proving invalid empty Keep updates are refused and the last-good Keep remains active.
- Preserved `connectorId` through Keep deserialize/migration so sidecar-derived connector portal authority keeps the bound server identity.
- Added pure keep-store coverage proving `SaveDoc.keep` can be accepted from a save envelope, missing Keep data is refused, and invalid Keep updates leave the last-good Keep active.
- Added routing coverage proving a forged legacy RoutingPlan cannot override `resolveTarget()` after a Keep document with deployable conveyor geometry is installed.
- Added routing coverage proving a non-deployable Keep routing update is refused and the last-good Keep-derived route remains active.
- `sidecar/index.js` remained untouched because it is still contended.
- 2026-06-26T21:59Z board retry confirmed `sidecar/index.js` is still contended, so the HTTP keep/run authority slice remains held.

## Targeted tests

- `node test\routing.b5.test.js` - pass, 30 assertions.
- `node test\keep-authority.test.js` - pass, 9 assertions.
- `node test\worldmodel.test.js` - pass, 181 assertions.
- `node test\routing.b5.test.js` - pass, 36 assertions on 2026-06-26T04:55:42-04:00.
- `node test\keep-authority.test.js` - pass, 9 assertions on 2026-06-26T04:55:42-04:00.
- Not rerun in the 2026-06-26T05:50:59-04:00 loop because no source code changed.
- Not rerun in the 2026-06-26T06:52:58-04:00 loop because the session is held before code changes.
- Not rerun in the 2026-06-26T13:56:34-04:00 loop because the session is held before code changes.
- Not rerun in the 2026-06-26T14:56:42-04:00 loop because the session is held before code changes.
- Not rerun in the 2026-06-26T15:57:29-04:00 loop because the session is held before code changes.
- Not rerun in the 2026-06-26T16:58:48-04:00 loop because the session is held before source code changes.
- Not rerun in the 2026-06-26T17:59:12-04:00 loop because the session is held before source code changes.

## Full gates

- `npm.cmd run test:fast` - pass on 2026-06-26T02:54:34-04:00.
- `npm.cmd run test:fast` - pass on 2026-06-26T03:56:00-04:00.
- `npm.cmd run test:fast` - pass on 2026-06-26T04:55:42-04:00.
- Not rerun in the 2026-06-26T05:50:59-04:00 loop because the session is held before code changes. Run before any READY claim.
- Not rerun in the 2026-06-26T06:52:58-04:00 loop because no source code changed and the session remains HELD. Run before any READY claim.
- Not rerun in the 2026-06-26T13:56:34-04:00 loop because no source code changed and the session remains HELD. Run before any READY claim.
- Not rerun in the 2026-06-26T14:56:42-04:00 loop because no source code changed and the session remains HELD. Run before any READY claim.
- Not rerun in the 2026-06-26T15:57:29-04:00 loop because no source code changed and the session remains HELD. Run before any READY claim.
- Not rerun in the 2026-06-26T16:58:48-04:00 loop because no source code changed and the session remains HELD. Run before any READY claim.
- Not rerun in the 2026-06-26T17:59:12-04:00 loop because no source code changed and the session remains HELD. Run before any READY claim.

## Live verification

- Not run in this checkpoint. No frontend runtime flow or HTTP route was changed.

## Blockers / holds

- HELD-FOR-COORDINATION on `sidecar/index.js` for the `/api/keep` hook. `node scripts/board.mjs --files sidecar/index.js sidecar/keep-store.js sidecar/routing/router.js test/sidecar.http.test.js docs/session-status/session-1-keep-authority.md` on 2026-06-26T07:53Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit`, `agent/eyehold-replacement-eval`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this checkpoint.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js sidecar/keep-store.js sidecar/routing/router.js test/sidecar.http.test.js test/keep-authority.test.js docs/session-status/session-1-keep-authority.md` on 2026-06-26T08:51Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit`, `agent/eyehold-replacement-eval`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this checkpoint.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js sidecar/keep-store.js sidecar/routing/router.js test/sidecar.http.test.js docs/session-status/session-1-keep-authority.md` on 2026-06-26T09:50Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit`, `agent/eyehold-replacement-eval`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js sidecar/keep-store.js sidecar/routing/router.js test/sidecar.http.test.js test/keep-authority.test.js test/routing.b5.test.js docs/session-status/session-1-keep-authority.md` on 2026-06-26T10:52Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit`, `agent/eyehold-replacement-eval`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js sidecar/keep-store.js sidecar/routing/router.js test/sidecar.http.test.js test/keep-authority.test.js docs/session-status/session-1-keep-authority.md` on 2026-06-26T17:56Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit`, `agent/eyehold-replacement-eval`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js sidecar/keep-store.js sidecar/routing/router.js test/keep-authority.test.js test/routing.b5.test.js frontend/app/world.js frontend/app/harness.js frontend/app/app.js frontend/app/worldmodel.js` on 2026-06-26T18:56Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit`, `agent/eyehold-replacement-eval`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js` on 2026-06-26T19:57Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit` and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js` on 2026-06-26T20:58Z reported active uncommitted edits to `sidecar/index.js` in `agent/hermes-settings-audit` and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.
- HELD-FOR-COORDINATION still applies to `sidecar/index.js`. `node scripts/board.mjs --files sidecar/index.js` on 2026-06-26T21:59Z reported active uncommitted edits to `sidecar/index.js` in `(detached)`, `agent/hermes-settings-audit`, and `agent/eyehold-spend-model-honesty`. No `sidecar/index.js` edits were made in this loop.

## Readiness claim

- Checkpoint only, not Session 1 READY. Keep-store and router now derive routing/capability authority from accepted Keep documents, but remaining Session 1 loop items include `/api/keep` acceptance/persistence hook in `sidecar/index.js`, `/api/run` ignoring forged `body.placed`, HTTP forged-keep/routing/capability tests, `npm.cmd run test:fast`, and live refit/COMMS smoke.

## Next loop condition

- Retry the `sidecar/index.js` board check after the active lanes release it. Then wire `/api/keep`/save acceptance through `keepStore.setSaveDoc()` and `router.setKeep()` before removing interactive trust in renderer-posted `placed`.
