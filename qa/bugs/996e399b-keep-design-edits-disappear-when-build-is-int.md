---
fingerprint: 996e399b
slug: keep-design-edits-disappear-when-build-is-int
title: Keep design edits disappear when Build is interrupted
surface: world
severity: P1
status: fixed
found: 2026-09-19
lane: agent/keep-save-0919
fix: fb02b1e7d
origin: customer
report: Owner-relayed customer report on 2026-09-19: keep reverted and all build changes disappeared
affected: Unknown customer version and operating system; reproduced on source acbf3c225 (0.12.3)
family: keep-design-persistence
installer: unverified
recovery: unconfirmed
---

# Keep design edits disappear when Build is interrupted

## Symptom

A customer reported spending time designing a keep, then seeing it revert with all build changes gone. The original customer's interruption, build and platform are unknown.

## Repro

1. Start the isolated seeded app with `node dev/seed.js --keep`.
2. Open BUILD > REFIT KEEP > Presets and apply QUIET RETREAT to the starter outpost.
3. Observe 2 rooms, 1 hall, 408 tiles and 12 objects. Leave Build open without SAVE & EXIT.
4. Reload and reopen Build. Before the fix it returns to 1 room, 198 tiles and 8 objects.

## Evidence

Live browser reproduction on source acbf3c225 at isolated localhost port 8939, 2026-09-19: `#refit-sub` changed from `OUTPOST · 1 ROOM · 198 TILES · 8 OBJECTS` to `KEEP · 2 ROOMS · 1 HALL · 408 TILES · 12 OBJECTS`, then reverted to the original readout after reload. The seeded `agent.save.json` still contained 8 props before reload. `frontend/app/build.js:246` subscribed only for rendering invalidation; only `close()` called `opts.persist()`. No app-level keep change subscription existed. Regression anchor: `test/keep-autosave.test.js`.

## Verdict

Source-fixed in `fb02b1e7d`: the independently reproduced Build interruption now preserves the design. Full fast gate 819/819 and customer journeys 36/36 PASS, with live reload, restart, fresh-origin restore, appearance editing and offline-edit recovery proof. Original customer attribution and recovery remain unconfirmed. Installer verification remains separate. See `qa/digests/2026-09-19-keep-autosave.md` for receipts and limitations.

## Regression

The app now subscribes to canonical keep mutations and saves after each completed browser gesture, coalescing synchronous model changes. This includes edits outside Build, undo/redo and presets. Failed local writes cannot flash saved or show the editor's success notification. Tests execute production App persistence, Save, and WorldModel functions and check full serialized keep equality after reload.

Live after-fix proof: applying the same preset wrote 12 props and all 3 room records (including the hall) to the disk save at revision 7 without closing Build. Reload retained `KEEP · 2 ROOMS · 1 HALL · 408 TILES · 12 OBJECTS`. The owned sidecar was stopped and relaunched with `--keep`; a fresh `localhost:8939` browser origin (separate cache from `127.0.0.1:8939`) restored the identical readout from disk. Live preset undo/redo produced 1 room/8 objects → 2 rooms/12 objects → 1 room/8 objects. A subsequent DECK edit saved `HOME.floorStyle=amber` and `HOME.floorMat=plank` while Build was open; reload retained the rendered plank floor. No browser error-level console entries were present at final inspection.

## Sibling coverage

{
  "adapters": [
    {"target":"canonical keep model and local cache","state":"covered","test":"test/keep-autosave.test.js","scenario":"production App watcher, Save and WorldModel serialize the full keep after each edit","gate":"fast"},
    {"target":"durable sidecar and stale windows","state":"covered","test":"test/cloudsave-concurrency.test.js","scenario":"stale window cannot replace a newer revision; queued own writes and missing unload acknowledgments retain content","gate":"fast"}
  ],
  "entrypoints": [
    {"target":"floor, wall, hull, prop, preset and undo/redo mutations","state":"covered","test":"test/keep-autosave.test.js","scenario":"appearance, placement, move, removal, preset, undo and redo update the complete saved keep without Build.close","gate":"fast"},
    {"target":"canonical model edits outside Build","state":"covered","test":"test/keep-autosave.test.js","scenario":"App-level subscription runs without an editor instance","gate":"fast"}
  ],
  "displays": [
    {"target":"local storage failure warning","state":"covered","test":"test/keep-autosave.test.js","scenario":"quota failure preserves last good cache and cannot flash saved; retry saves in-memory edits","gate":"fast"},
    {"target":"customer installed Windows/macOS app","state":"blocked","reason":"Customer build and platform were not supplied; no rebuilt installer was exercised. Live source verification used the isolated seeded browser app."}
  ],
  "lifecycle": [
    {"target":"reload and keep reentry","state":"covered","test":"test/keep-autosave.test.js","scenario":"saved keep deserializes identically and replaced keeps cannot leave duplicate save subscriptions","gate":"fast"},
    {"target":"offline boot and unload acknowledgment","state":"covered","test":"test/cloudsave-concurrency.test.js","scenario":"dirty cache is retained on boot and matching durable unload payload is recognized after lost acknowledgment","gate":"fast"},
    {"target":"abrupt OS termination or power loss before local cache is flushed by the browser","state":"blocked","reason":"Full sidecar restart and fresh-origin recovery were verified after disk acknowledgment; abrupt OS/power-loss durability was not tested and is not claimed."}
  ]
}
