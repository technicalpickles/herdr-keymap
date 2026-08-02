# Popup placement for the keymap palette

**Date:** 2026-08-02
**Branch:** `technicalpickles` (personal daily-use branch, based on `fuzzy-search`)

## Problem

The keymap palette currently opens with `placement = "overlay"`, which zooms
a temporary pane to fill the whole screen. That hides everything else in the
workspace while picking a command, and wastes most of the width on a
~35-entry, single-column list.

Herdr 0.7.4 added `placement = "popup"` for plugin panes: a session-modal
floating terminal that sits over the tiled layout without changing it,
sized in terminal cells or percentages, leaving surrounding panes visible.
This is a better fit for a quick command picker.

## Design

Manifest-only change plus one comment update — no functional code changes
needed.

### `herdr-plugin.toml`

- `[[panes]]` `palette` entry: change `placement` from `"overlay"` to
  `"popup"`; add `width = "80%"` and `height = 20`.
- `min_herdr_version`: `"0.7.0"` → `"0.7.4"` (the version that introduced
  popup placement).
- `version`: `"0.6.0"` → `"0.7.0"`.
- `description`: reword "in an overlay" to "in a popup".

Fixed `height = 20` (rather than a percentage) keeps the popup's row count
predictable regardless of terminal size — the list's own page-sizing logic
(below) adapts to whatever height it's given, so a fixed height doesn't
need separate tuning per terminal.

### `src/keymap.ts`

No functional change. `computePageSize()` already derives the visible list
length from `process.stdout.rows`, which will simply reflect the popup's
actual pty dimensions instead of the full-screen overlay's. Only the
explanatory comment above it (lines 11-17) needs rewording — it currently
says "full-height overlay pane," which will no longer be accurate.

### Docs

- `README.md`: update the usage note to describe the popup behavior instead
  of the overlay behavior.
- `CHANGELOG.md`: add a `0.7.0` entry describing the placement change.

## Branching

This lands on a new `technicalpickles` branch created from `fuzzy-search`,
not on `fuzzy-search` itself. `fuzzy-search` backs the already-open,
unreviewed upstream PR (`The-Dave-Stack/herdr-keymap#1`); adding unrelated
commits there would silently change what that PR contains mid-review.
`technicalpickles` combines both the fuzzy-search changes and this popup
change for actual daily use via the locally linked plugin
(`herdr plugin link`, id `tds.keymap`), without touching the open PR.

Whether/how popup placement itself eventually goes upstream (as its own PR,
possibly based on `main` since it's orthogonal to the fuzzy-search UX
change) is a separate decision, deferred until there's a reason to make it.

## Verification

After implementing, relink/checkout the branch and confirm live in herdr:

- `prefix+m` opens a floating popup, not a full-screen takeover.
- Panes behind the popup remain visible.
- The list still renders sensibly at a 20-row popup height (page size,
  scrolling, banner/footer chrome all fit).

## Out of scope

- Any upstream PR for this change.
- A config flag or second pane entrypoint choosing between overlay and
  popup — deferred; see the branch-target decision above for why a hard
  switch was chosen instead.
- True fuzzy matching (already tracked as a known gap from the earlier
  fuzzy-search work).
