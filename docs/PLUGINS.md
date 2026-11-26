# Eyehold plugins

A plugin is one folder with a single approval. It can add **windows** (your own HTML/JS, opened as real Eyehold
windows), **code that runs in the keep in its own process** (tools for your crew, hooks on every run, background
jobs, a backend for its windows), and a **terminal** that stands in the keep as its body, or any mix of those.

- **Where plugins live:** `<workspaces>/plugins/<id>/`. ABILITIES → CREATE / ADVANCED → EXTENSIONS → **COPY FOLDER PATH** shows the exact folder.
- **Fastest start:** EXTENSIONS → **Create a plugin**. It writes a working starter (a window with notes saved by the
  keep and a KIT tab showing every component) and opens that window. Edit the files from there.
- **Approval:** approval is locked to a hash of **every file** in the folder. Change one character anywhere and the
  plugin turns off until you approve the new code in EXTENSIONS: its code stops, and any open window says it changed
  the next time it talks to the keep (or when you reopen it).

Plan and open decisions: <https://claude.ai/artifact/8qxbub7yipDMTfavubYwZq>.

## The folder

```
plugins/pr-radar/
  plugin.json        the manifest
  index.js           optional — code the keep loads (hooks). Omit it, and "main", for a window-only plugin
  ui/index.html      a window's page (any HTML/JS/CSS, any framework, relative assets)
  ui/app.js
```

```json
{
  "name": "PR Radar",
  "version": "1.0.0",
  "description": "Open pull requests at a glance",
  "main": "index.js",
  "screens": [
    { "id": "main", "title": "PR RADAR", "entry": "ui/index.html", "size": "panel" }
  ]
}
```

| field | rules |
|---|---|
| `screens[].id` | letters, numbers, `-`, `_`; max 32; unique |
| `screens[].title` | plain text shown in the keep's title bar; max 40; markup characters are dropped |
| `screens[].entry` | an `.html` file inside the folder (no `..`, no absolute path, no dot-folders) |
| `screens[].size` | `panel` (default) or `wide`, the keep's two window sizes |
| `main` | leave it out **and** name screens for a window-only plugin. Such a plugin has no access to your computer |

Up to 8 screens per plugin, 32 plugins, 512 files / 16 MB per plugin folder.

## How a window runs

- The page is served by the sidecar from `/plugin-ui/…` and shown in a **sandboxed frame with an opaque origin**. It
  runs any JavaScript you like, loads its own relative assets, and can `fetch` any public API that allows CORS.
- It **cannot** read the keep page, the keep's API token, or call the keep's `/api` directly. Everything
  it asks of the keep goes through the `eyehold` bridge below. The keep answers only for the plugin that owns
  the frame, and a page can't name another plugin.
- The keep draws the title bar, the **PLUGIN** plate, the dock/minimize/expand/close controls and the glass sheet.
  Your page is everything inside. Text size follows the keep's TEXT SIZE setting automatically.

## The kit (the keep look, free)

Every page gets `eyehold-kit.css` and `eyehold-kit.js` injected first in `<head>`. The CSS sits in `@layer eyehold`,
the lowest layer, so **any CSS you write wins** without `!important`. The page background is transparent: the
window's glass is your background.

**Tokens** (always the keep's live values; they repaint when the Commander changes the phosphor):
`--ph --ph-bright --ph-dim --ph-faint --ink --text --gold --bg --panel --panel2`
`--ph-rgb --ph-bright-rgb --gold-rgb` (use as `rgba(var(--ph-rgb), .2)`)
`--ok --ok-rgb --bad --bad-rgb --warn` (semantic, constant across themes)
`--gd-edge --gd-light --gd-face --gd-hover --gd-shadow --gd-strip` (the glass recipes)
`--fs-0…5 --s-1…5 --r-sm --r --r-lg --t-fast --t-med --ease-soft --sn-font`

**Classes:**

| group | classes |
|---|---|
| layout | `sn-stack` (column, gap) · `sn-row-flex` · `sn-grid` (auto-fit cards) · `sn-spacer` |
| surfaces | `sn-panel` · `sn-card` · `sn-sect` (the ▮ HEADER strip; put an `sn-list`/`sn-card`/`sn-well` right after it) · `sn-list` + `sn-item` (glass rows; `.sel` or `aria-selected="true"` lights one) · `sn-well` |
| type | `sn-title` · `sn-label` · `sn-hint` · `sn-muted` · `sn-mono` · `sn-empty` |
| data | `sn-stats` + `sn-stat` (`<b>` value + `<span>` label; `.ok .warn .bad`) · `sn-table` · `sn-badge` (`.ok .gold .bad`) · `dot` (`.ok .warn .bad .off`) · `sn-progress > i` (set `width`) |
| controls | `sn-btn` (`.primary .danger .xs`) · `sn-input` · `sn-select` · `sn-textarea` · `sn-check` · `sn-field` (label + control) · `sn-tabs` + `sn-tab` (`.on` / `aria-selected`) |
| states | `sn-loading` · `sn-error` |

Bare `button`, `input`, `select` and `textarea` are already themed, so no control ever shows the browser's white
paint. Keep it matte: the keep uses edges and light, not glows.

## The `eyehold` bridge

Every call returns a Promise. A refused call rejects with an `Error` that says why.

```js
const { plugin, screen } = await eyehold.ready;   // { id, name, version }, { id, title }

await eyehold.store.set('notes', [{ text: 'hi' }]); // any JSON value, ≤ 256 KB each, ≤ 4 MB per plugin
await eyehold.store.get('notes');                  // → value, or null
await eyehold.store.delete('notes');
await eyehold.store.keys();                        // → ['notes', …]

await eyehold.backend.call('summary', { days: 7 }); // your main file's api.handle('summary', fn), in its process

eyehold.ui.toast('Saved', 'ok' | 'warn' | 'bad');  // a keep notification, shown as "<Plugin>: Saved"
eyehold.ui.setTitle('3 open');                     // title bar becomes "PR RADAR · 3 open"
eyehold.ui.open('settings');                       // open another screen of THIS plugin
eyehold.ui.close();
eyehold.ui.openLink('https://github.com/…');       // https only, opens the real browser
eyehold.ui.setHeight(480);                         // fixed content height (default: follows your content)
eyehold.ui.autoHeight(true);                       // follow the content again (heights are kept between 80 px and
                                                   // 78% of the screen; a docked or resized window fills its body)

eyehold.theme.vars;                                // the live tokens, e.g. vars['--ph']
eyehold.theme.onChange((vars) => redrawChart(vars));
```

The store lives in `<workspaces>/plugin-data/<id>.json` (durable, survives restarts, outside every agent's files).

## Code that runs in the keep (`main`)

Your `main` file runs in **its own process** once approved: a crash, a hang or an `exit()` costs the plugin, never
the keep. It has **your computer's permissions** (it is ordinary Node), which is why it needs your approval and
why every edit turns it off until you approve it again. A crashed plugin restarts on its next use, at most 3 times
in 5 minutes. `register(api)` runs once, and everything is registered inside it (sync or async):

```js
module.exports = {
  register(api) {
    // hook every run
    api.on('pre_tool_call', (p) => p.tool_name === 'shell.exec' ? { decision: 'block', reason: 'not today' } : null);

    // a tool the crew can call (see "Terminals" below)
    api.tool({
      name: 'list_prs',                        // letters, numbers, _ or -; max 48
      description: 'List my open pull requests',
      readOnly: true,                           // a read-only tool (still asks before each call)
      parameters: { type: 'object', properties: { repo: { type: 'string' } } },
      run: async (args, ctx) => fetchPrs(args.repo)   // return a string or any JSON; ctx = { agentId, runId }
    });

    // answer this plugin's own windows: await eyehold.backend.call('summary', { days: 7 })
    api.handle('summary', async ({ days }) => ({ open: 12, days }));

    // a background job (10 s minimum)
    api.every(60000, async () => api.store.set('lastSync', Date.now()));

    // the SAME store the windows use
    api.store.get('notes'); api.store.set('notes', []); api.store.delete('x'); api.store.keys();
    api.log('shown in the keep log as [plugin:<id>]');
  }
};
```

Hook events: `pre_tool_call` (can block), `post_tool_call`, `pre_llm_call` (can add `{ context }` or block),
`post_llm_call`, `on_session_start`, `on_session_end`, `on_pre_compress`, `on_memory_write`, `subagent_stop`.
A hook has 5 s by default (`api.on(event, fn, { timeoutMs })` asks for up to 30 s), and a failing hook never blocks a run.
A tool call has 120 s; a window call has 30 s in the keep (the page waits 45 s, to cover a cold start). Hook
payloads are copies (they cross the process line): return a decision, never edit the payload in place. Logging is
capped at 120 lines a minute per plugin.

## Terminals (how tools reach your crew)

Eyehold runs on **object = capability**: an agent can use what stands in its room. A plugin's tools reach agents
through its **PLUGIN TERMINAL**, a prop in the REFIT catalog under CAPABILITY. When you approve or create a plugin
with tools, Eyehold **places its terminal in the lead's room for you**. You can move it, place more in other
rooms, or bind a terminal to a different plugin by clicking it in REFIT. Clicking a terminal in the keep opens
the plugin's window.

Plugin tools use the same trust rules as connector tools. A watched run shows you an approval card for each call
("use the PR Radar plugin tool “list_prs” …"; *Always* is allowed). An unattended run doesn't get them. Content
from outside the keep revokes them for the rest of the run. Their results reach the model fenced as external
data. The TOOLSETS **connectors** switch turns them all off.

## Your crew can build plugins

Ask in COMMS: "build me a plugin that shows my open PRs". The agent uses the plugin authoring tools (`plugin.draft_start`,
`plugin.draft_from_installed`, `plugin.draft_read`, `plugin.draft_write`, `plugin.check`, `plugin.preview`, `plugin.submit`; the opt-in
**Build a Eyehold Plugin** library skill has the full recipe):

- It writes a **draft** in `<workspaces>/plugin-drafts/<id>`, never in `plugins/` and never in its own files.
- `plugin.check` parses and compiles the draft **without running it**, and warns about looks that don't match the keep.
- `plugin.preview` opens the draft as a **DRAFT** window (gold plate) on your screen. The page runs sandboxed with **no
  network**, a throwaway store and no backend. Its keep code never runs.
- `plugin.submit` asks you first, then installs the plugin **OFF**. It switches on only when you press APPROVE & ENABLE in
  EXTENSIONS, the same hash-locked approval every plugin gets. An agent can never switch its own plugin on.
- To change an installed plugin, the agent uses `plugin.draft_from_installed` (it asks you first, since it reads that
  plugin's code). Submitting the new version turns the plugin off until you approve the new code.
