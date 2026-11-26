# The Eyehold — Source Inventory & Extensible Realm Plan (v0.1)
Date: 2026-10-15
Status: planning document only; no runtime changes, tests, or visual assets yet.

## Goal
Reskin the forked Eyehold frontend into the original dark-fantasy Eyehold world while preserving truthful AI runtime telemetry, workkeep permissions, agent delegation, pathfinding, and the possibility of adding arbitrary new themed rooms/factions without editing hardcoded seven-room logic.

## Verified source entrypoints (fork default branch feat/harness-backend)
- `frontend/index.html`: HTML/CSS/script loader, boot/splash and overseer creation; contains references to protected Eyehold branding, logo, sprites and UI terminology.
- `frontend/app/world.js`: primary multi-room canvas renderer; camera pan/zoom, procedural keep bake, runtime projections, geometry recalc, characters, routing and pathing.
- `frontend/app/zones.js`: pure idle-zone geometry derived from rooms/workkeeps; includes multi-room/solo and leash modes.
- `frontend/app/app.js`: user-facing agent roster and selected overseer/hero, agent skins, runtime bridge state.
- `frontend/app/workflowpanel.js`: workflow UI for multiple bays and routing lines; relies on compiled workflow plan/server facts.
- `sidecar/`: local Node agent runtime (see docs/BRAIN.md); dispatch and capability validation must not be overridden by themes.
- `shared/`: cross-boundary event/schema contracts; do not change merely to theme the UI.
- `src-tauri/`: desktop shell and app identity/updater/signing to change later.
- `docs/BRAIN.md`: architectural orientation, but old; verify all claims against source before edits.
- `docs/WORKFORCE_ZONES_PLAN.md`: old plan for derived room/leash restrictions, verify contemporary implementation.

## Remaining inventory required before code mutations
1. List all `frontend/app/*.js` scripts actually loaded by `frontend/index.html`; identify `worldmodel.js`, `keepbake.js`, build-mode controls, renderer, pathfinder, sprite/portrait registries and storage boundary.
2. Inventory `frontend/assets/` by filename, pixel dimensions, license/provenance. Mark all original author's reserved name/logo/keep art/sprites as **replace**, including any copies in website/Tauri icons or build resources.
3. Find explicit limits on room count, keep dimensions, tile coordinates, prop counts, agent count, zoom/minimap, and persistence schema; record performance at 1, 7, 12, 25 rooms.
4. Trace create room -> geometry bake -> per-agent zone -> capability scope -> sidecar authorization -> SSE event -> world animation.
5. Inventory existing dynamic room creation/UI before implementing anything redundant.

## Extensible architecture (proposed, not yet implemented)
- **Realm = underlying keep**. Keep the existing canonical WorldModel data and serialized layout as the only authority for geometry and capability boundaries.
- **Territory = room metadata**, keyed by stable underlying room ID, NOT fixed room array index and NOT theme name. An arbitrary number of territories may exist.
- **Faction = presentation and default agent role template**, not an authority bypass. A faction can occupy multiple rooms; rooms can be reassigned.
- **Theme package registry**, a declarative manifest resolving each room to `themeId`, `factionId`, `environmentId`, `assetSetId`, descriptive display name, and optional decorations. Fallback to a generic fantasy room/agent when assets are unavailable.
- **Room addition workflow**: user opens Build Mode -> Add Territory -> chooses room type/template and optional team -> places/resizes/connects room -> assigns permitted workkeeps/tools/agents -> saves. The existing layout compiler/pathfinder validates adjacency, routing and privileges. No recompilation required for a new room of an existing type.
- **New faction workflow**: add a new manifest entry + sprite assets and optional role templates. Do not add switch statements to world.js for each faction; registry-driven asset selection.
- **Sauron-like overseer**: use original 'The Eye' identity, bind to actual lead agent ID and supervisor permissions; no unlimited privileges merely from character skin.
- **State separation**: theme manifests are presentation metadata; every work/blocked/completed animation remains tied to real runtime events. No fabricated agent work or revenue indicators.
- **Viewport growth**: retain existing world/local origin-rebase and pan/zoom behavior. Add minimap/territory navigation and visibility culling if profiling shows a need. Room growth must not force a fixed-screen seven-room composition.
- **Storage/versioning**: version the presentation metadata; migrate old layouts with defaults, preserve unknown future fields, and provide recovery if an asset pack is missing.
- **Accessibility**: each room/faction has an accessible text name and statuses readable without color.

### Example *proposed* manifest shape (not a claim about existing API)
```json
{
  "schemaVersion": 1,
  "worldTheme": "eyehold",
  "rooms": {
    "room-stable-id": {
      "displayName": "Stone Forge",
      "environmentId": "stone-forge",
      "factionId": "deepforge",
      "assetSetId": "stone-forge-v1"
    }
  }
}
```
The canonical underlying rooms, doors, bays, routes, agent permissions and tools must remain in their existing stores.

## Initial optional territory presets
Eye's Keep (supervisor); War Foundry (bulk operations); Moonleaf Hall (writing); Stone Forge (engineering); Black Archive (research/memory); Signal Roost (communications); Astral Tower (deep reasoning). These are *presets*, never a maximum or exclusive allocation. Users may add more territories of the same or different type.

## Change sequence and gates
P0: inventory actual current code and asset rights, identify bottlenecks, no visual changes.
P1: add independent, headless-tested manifest validator/resolver with default/fallback theme; no state authority changes.
P2: layer realm metadata onto existing dynamic Build Mode; regression tests for save/load, adding 8th/12th room, room names, repeated factions, and empty-room layouts.
P3: add original tiles, sprites and animations, preserving projected state and collision/pathing.
P4: add minimap/navigator and renderer optimization only if benchmarks require them.
P5: replace app/website/install branding; review original and third-party licenses and build/signing requirements.
Gates: Node syntax tests, `npm run test:fast`, `npm run test:http` where relevant, direct UI work/idle/delegation tests, performance/migration tests, copyright/asset provenance review.

## Risks / nonclaims
- Room count and rendering capacity have not yet been performance-tested.
- Current room/faction data shape and identity keys still need direct source inspection.
- The open-source code does NOT grant rights to the original Eyehold branded assets.
- This plan file itself does not make the app functional or visually themed.
