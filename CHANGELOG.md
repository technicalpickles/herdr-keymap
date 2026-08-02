# Changelog

All notable changes to this plugin are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning is
[SemVer](https://semver.org/).

## [0.7.2] - fork spike (unreleased upstream)

### Changed
- `formatChoice()` now pads the `[category]` tag itself, not just the key
  column, so descriptions line up in one column regardless of category name
  length (`[tab]` and `[workspace]` previously threw off every description
  after them by 6 characters).
- `Exit` moved from a pinned first entry to the last entry in the list, and
  dropped its own embedded `❯` (inquirer already marks the active row with
  its own cursor glyph, so the old `❯ Exit` doubled up).
- Shortened the `goto` action's "no CLI equivalent" explanation — the old
  text was long enough to wrap mid-word in an 80%-width popup.



### Removed
- Dropped the banner header (plugin name + version box) from every prompt
  screen. It existed to stay visible while navigating a full-screen overlay;
  in a small popup it's pure overhead. `headed()`, `HEADER`, and `NAV_THEME`
  are gone from `herdr-cli.ts`; prompts now pass their message directly and
  use inquirer's default theme. `computePageSize()`'s chrome budget dropped
  from ~10 rows to ~4 accordingly.

## [0.7.0] - fork spike (unreleased upstream)

### Changed
- Switched the palette pane from `placement = "overlay"` (full-screen
  takeover) to `placement = "popup"` (80% width, 20 rows), added in herdr
  0.7.4. The palette now floats over the surrounding panes instead of
  hiding them. `min_herdr_version` bumped to `0.7.4` accordingly.

## [0.6.0] - fork spike (unreleased upstream)

### Fixed
- `@inquirer/search` hardcodes `pageSize` to 7 regardless of terminal size,
  so the list only used a sliver of the overlay pane. Size it to
  `process.stdout.rows` instead (minus ~10 rows of banner/message/footer
  chrome), falling back to 15 when stdout isn't a TTY.

### Changed
- Replaced the two-level category → command menu with a single
  `@inquirer/prompts` `search` prompt: every action listed up front, tagged
  with its category, type to filter by category/key/description. No new
  dependency (`@inquirer/search` is already resolved via `@inquirer/prompts`).
  Filtering is case-insensitive substring, not true fuzzy.
- `❯ Exit` is now a pinned entry in the search list instead of a separate
  category screen.

## [0.5.1] - 2026-07-17

### Fixed
- Banner box was skewed on its first line by inquirer's `? ` prompt prefix.
  Blank the prefix on the banner screens and lead with a newline so the box
  sits flush at column 0.

## [0.5.0] - 2026-07-17

### Added
- Banner header (plugin name + version, read from `herdr-plugin.toml` at
  runtime) shown atop the navigation screens — category list, command list,
  and the workspace/tab/agent pickers — so it stays visible while navigating.

## [0.4.0] - 2026-07-17

### Changed
- Unified cancellation: any way you back out of an action (a `❮ Back` choice,
  an empty rename, declining a close confirmation, or `Esc`/`Ctrl+C` inside a
  prompt) now returns to the action list without running anything — no more
  forced `Ctrl+C` that dropped the whole palette. The palette only closes via
  `❯ Exit` / `Esc` at the category screen, or after a command runs.
- `switch_tab` is now a tab picker (with `❮ Back`) instead of a
  type-the-number prompt.

## [0.3.1] - 2026-07-17

### Added
- `❮ Back` choice in the agent and workspace pickers — cancel a selection and
  return to the action list without Ctrl+C.

### Changed
- Agent picker labels each agent with its workspace (was the raw cwd), so the
  full-session list (a herdr session spans all its workspaces) is legible.

## [0.3.0] - 2026-07-17

### Added
- Special `agent` category exposing herdr `agent` subcommands (Focus agent,
  Rename agent) with an agent picker. These are commands, not keybindings, so
  they render as `(cmd)` and carry no key. Powered by `herdr agent
  list/focus/rename` (target = `terminal_id`).

## [0.2.1] - 2026-07-17

### Changed
- Selecting an action with no CLI equivalent now names the key to press
  (and says to close the palette first, since it grabs all terminal input)
  instead of just saying "use the keyboard shortcut". Actions with no key
  bound say so and point at `config.toml`.

## [0.2.0] - 2026-07-16

### Fixed
- Pane-scoped actions (`split`, `focus`, `zoom`, `close_pane`) targeted the
  palette overlay instead of the pane the user came from. Splitting the
  overlay also made herdr ignore `--direction`, so a horizontal split came
  out vertical. These now resolve the originating pane from
  `HERDR_PLUGIN_CONTEXT_JSON.focused_pane_id`.

### Added
- Focus follows the newly created pane on split, and the new workspace, tab,
  and worktree on create (`--focus`).

### Changed
- New tab / workspace inherit the current pane's working directory
  (`focused_pane_cwd`) instead of the palette overlay's cwd (the plugin dir).

## [0.1.0] - 2026-07-08

### Added
- Initial release: overlay palette listing herdr keybindings by category and
  running the ones with a CLI equivalent. Published to
  [The-Dave-Stack/herdr-keymap](https://github.com/The-Dave-Stack/herdr-keymap).
