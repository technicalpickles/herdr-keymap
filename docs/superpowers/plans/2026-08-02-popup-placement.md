# Popup Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the keymap palette from `placement = "overlay"` (full-screen
takeover) to `placement = "popup"` (floating, leaves surrounding panes
visible), on a new `technicalpickles` branch, without touching the
already-open `fuzzy-search` PR.

**Architecture:** Manifest-only placement change plus documentation updates.
No functional code changes are required for the palette's own list
rendering — `computePageSize()` already derives its size from
`process.stdout.rows`, which will simply reflect the popup's dimensions
instead of the overlay's.

**Tech Stack:** Node (runs `.ts` natively), `smol-toml` for manifest
parsing, `@inquirer/prompts`.

## Global Constraints

- Branch: `technicalpickles`, created from `fuzzy-search`. Do not commit to
  `fuzzy-search` (backs open, unreviewed upstream PR
  `The-Dave-Stack/herdr-keymap#1`).
- `min_herdr_version` must be `"0.7.4"` (the version that introduced popup
  placement) — verbatim string, matching existing quoting style in
  `herdr-plugin.toml`.
- `version` bumps to `"0.7.0"`.
- Popup size: `width = "80%"`, `height = 20` (fixed row count, not a
  percentage — see design doc for rationale).
- Design doc: `docs/superpowers/specs/2026-08-02-popup-placement-design.md`
  (approved via crit with no comments).

---

### Task: manifest-popup-placement

**Files:**
- Modify: `herdr-plugin.toml`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the `palette` pane declaration other tasks' docs reference
  (`placement = "popup"`, `width = "80%"`, `height = 20`).

- [ ] **Step 1: Edit the manifest**

Change `herdr-plugin.toml` from:

```toml
id = "tds.keymap"
name = "Keymap Palette"
version = "0.6.0"
min_herdr_version = "0.7.0"
description = "List herdr keybindings in an overlay and run the ones with a CLI equivalent"
platforms = ["linux", "macos"]

[[build]]
command = ["npm", "ci"]

[[panes]]
id = "palette"
title = "Keybindings"
placement = "overlay"
command = ["node", "src/keymap.ts"]
```

to:

```toml
id = "tds.keymap"
name = "Keymap Palette"
version = "0.7.0"
min_herdr_version = "0.7.4"
description = "List herdr keybindings in a popup and run the ones with a CLI equivalent"
platforms = ["linux", "macos"]

[[build]]
command = ["npm", "ci"]

[[panes]]
id = "palette"
title = "Keybindings"
placement = "popup"
width = "80%"
height = 20
command = ["node", "src/keymap.ts"]
```

The `[[actions]]` block below it (`open_palette`) is unchanged.

- [ ] **Step 2: Validate TOML syntax**

Run: `node -e "const {parse} = require('smol-toml'); console.log(JSON.stringify(parse(require('fs').readFileSync('herdr-plugin.toml','utf8')), null, 2))"`

Expected: prints parsed JSON with `"placement": "popup"`, `"width": "80%"`,
`"height": 20`, `"version": "0.7.0"`, `"min_herdr_version": "0.7.4"` under
the `panes[0]` entry — no parse error.

- [ ] **Step 3: Commit**

```bash
git add herdr-plugin.toml
git commit -m "Switch palette pane to popup placement"
```

---

### Task: keymap-comment-reword

**Files:**
- Modify: `src/keymap.ts:11-17`

**Interfaces:**
- Consumes: nothing (comment-only change; `computePageSize()`'s signature
  and behavior are unchanged).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Reword the comment**

Change (`src/keymap.ts:11-17`) from:

```ts
// @inquirer/search hardcodes pageSize to 7 regardless of terminal size, which
// on a full-height overlay pane wastes most of the vertical space. Size it to
// the pane instead: header banner + blank lines + message (~6 rows) + footer
// hint + margin for a wrapped line (~4 rows) = ~10 rows of chrome; give the
// rest to the list. process.stdout.rows is unset when stdout isn't a TTY
// (e.g. under test or a piped invocation) — fall back to something roomier
// than inquirer's default in that case too.
```

to:

```ts
// @inquirer/search hardcodes pageSize to 7 regardless of terminal size,
// which wastes space in a popup taller than 7 rows. Size it to the popup
// instead: header banner + blank lines + message (~6 rows) + footer hint +
// margin for a wrapped line (~4 rows) = ~10 rows of chrome; give the rest to
// the list. process.stdout.rows is unset when stdout isn't a TTY (e.g.
// under test or a piped invocation) — fall back to something roomier than
// inquirer's default in that case too.
```

`CHROME_ROWS = 10` and `computePageSize()` itself are unchanged.

- [ ] **Step 2: Run the test suite**

Run: `node --test test/*.test.ts`
Expected: `pass 2`, `fail 0` (same as baseline — this is a comment-only
change, included to confirm nothing else drifted).

- [ ] **Step 3: Commit**

```bash
git add src/keymap.ts
git commit -m "Reword pageSize comment for popup placement"
```

---

### Task: docs-popup-placement

**Files:**
- Modify: `README.md:1-4` (intro line)
- Modify: `README.md:104-113` (Usage section)
- Modify: `CHANGELOG.md` (new entry)

**Interfaces:**
- Consumes: the `width = "80%"`, `height = 20` values from
  `manifest-popup-placement`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the README intro line**

Change (`README.md:1-4`) from:

```markdown
# keymap

A herdr plugin: shows every keybinding (defaults + your `config.toml`
overrides) in a fuzzy-searchable overlay pane, and runs the ones that
have an equivalent in the herdr CLI.
```

to:

```markdown
# keymap

A herdr plugin: shows every keybinding (defaults + your `config.toml`
overrides) in a fuzzy-searchable popup, and runs the ones that have an
equivalent in the herdr CLI.
```

- [ ] **Step 2: Update the Usage section**

Change (`README.md:104-113`) from:

```markdown
## Usage

Press `prefix+m` (by default `ctrl+b`, release, then `m`) to open the
palette. It's headed by a banner with the plugin name and version (read from
`herdr-plugin.toml` at runtime), then drops straight into a search prompt —
every action is listed up front, tagged with its category (e.g.
`[pane] prefix+v              Split vertical (left/right)`); type to filter
by category, key, or description, arrow to the match, enter to run.
Matching is plain case-insensitive substring, not true fuzzy — enough for a
~35-entry list without pulling in a fuzzy-match dependency.
```

to:

```markdown
## Usage

Press `prefix+m` (by default `ctrl+b`, release, then `m`) to open the
palette. It opens as a floating popup (80% width, 20 rows) over whatever
you were looking at, rather than taking over the screen. It's headed by a
banner with the plugin name and version (read from `herdr-plugin.toml` at
runtime), then drops straight into a search prompt — every action is listed
up front, tagged with its category (e.g.
`[pane] prefix+v              Split vertical (left/right)`); type to filter
by category, key, or description, arrow to the match, enter to run.
Matching is plain case-insensitive substring, not true fuzzy — enough for a
~35-entry list without pulling in a fuzzy-match dependency.
```

- [ ] **Step 3: Add a CHANGELOG entry**

Insert into `CHANGELOG.md`, immediately after the `# Changelog` header and
its Keep-a-Changelog blurb (i.e. as the new first entry, above `## [0.6.0]`):

```markdown
## [0.7.0] - fork spike (unreleased upstream)

### Changed
- Switched the palette pane from `placement = "overlay"` (full-screen
  takeover) to `placement = "popup"` (80% width, 20 rows), added in herdr
  0.7.4. The palette now floats over the surrounding panes instead of
  hiding them. `min_herdr_version` bumped to `0.7.4` accordingly.
```

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "Document popup placement in README and CHANGELOG"
```

---

### Task: live-verification

**Files:** none (no file changes — this task relinks the plugin and
exercises it live in the current herdr session).

**Interfaces:**
- Consumes: the committed manifest from `manifest-popup-placement`.
- Produces: a pass/fail verdict that gates whether `herdr-cli.ts`'s
  `originPaneId()`/`currentPane()` comments (lines 79-94) and README's
  "Known caveats" section (lines 156-172) need updating. That reconciliation
  is deliberately **not** a task below — its exact wording depends on what
  this task finds, and the plan-writing rules forbid speculative/contingent
  content. Do it as a direct follow-up once the verdict is in, not as a
  pre-written step.

- [ ] **Step 1: Relink the plugin**

```bash
herdr plugin unlink tds.keymap
herdr plugin link /Users/technicalpickles/github.com/technicalpickles/herdr-keymap
```

Expected: both commands report success (this repo is already on the
`technicalpickles` branch with the manifest change committed).

- [ ] **Step 2: Reload the running session's config**

```bash
herdr server reload-config
```

Not strictly required (the `config.toml` keybinding text didn't change),
but cheap and rules out stale-config as a confound if something looks wrong.

- [ ] **Step 3: Ask the user to drive the live check**

This step needs a human at the keyboard — a popup is session-modal and
grabs all terminal input, so driving it from an agent's own pane (rather
than the user's attached client) risks stealing input focus from whatever
else is happening in the session. Ask the user to, in their own herdr
session:

1. Press `prefix+m` and confirm the palette opens as a floating popup
   (not a full-screen takeover) with the panes behind it still visible.
2. Type to filter to a pane-scoped action (e.g. `split vertical` or
   `zoom`) and run it — confirm it acts on the pane they were in before
   opening the palette, not an error and not some other pane.
3. Type to filter to `rename_tab`, run it, give it a throwaway name,
   confirm the *current* tab was renamed (not a different one), then
   rename it back (or re-run `rename_tab` to restore the original name).

- [ ] **Step 4: Reconcile docs based on the result**

If all three checks in Step 3 pass as expected: update the "NB:
HERDR_PANE_ID is set too, but it's the overlay's own id" comment in
`src/herdr-cli.ts:79-85` and the "Pane-scoped actions target the
originating pane, not the palette" caveat in `README.md:156-172` to
describe both placements accurately (overlay: palette is a real, focused
pane, so `currentPane()` resolves to the palette itself, coincidentally
correct for tab-scoped actions since the overlay shares the origin pane's
tab; popup: palette has no pane at all, so `currentPane()` resolves
directly to the origin pane). Commit as a follow-up:
`git commit -m "Document pane-focus behavior under popup placement"`.

If any check in Step 3 fails: stop and report the specific failure — do
not paper over it with a doc update. This would mean popup placement
breaks tab-scoped actions and needs a code fix (likely: route
`rename_tab`/`close_tab` through `originPaneId()`'s tab lookup instead of
`currentPane()`), which is new scope beyond this plan.
