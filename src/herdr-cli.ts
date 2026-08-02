import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

// None of @inquirer/prompts' individual prompt types (search/select/input/
// confirm) handle Escape themselves — confirmed from their source: each only
// branches on enter/tab/up/down and treats everything else, including
// Escape, as a line edit. createPrompt's shared machinery does support
// cancellation, though, via an AbortSignal passed as the prompt's second
// argument (context.signal) — it rejects with AbortPromptError through the
// same clean teardown Ctrl+C already uses. So: watch for Escape ourselves
// and abort through that channel, rather than reimplementing per-prompt key
// handling or forcing an ungraceful process.exit. Callers pass a thunk that
// forwards the context we build here to the actual prompt call, e.g.
// `withEscape((context) => search({...}, context))`.
export async function withEscape<T>(promptCall: (context: { signal: AbortSignal }) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const onKeypress = (_str: string, key: { name?: string } = {}) => {
    if (key.name === "escape") controller.abort();
  };
  process.stdin.on("keypress", onKeypress);
  try {
    return await promptCall({ signal: controller.signal });
  } finally {
    process.stdin.off("keypress", onKeypress);
  }
}

// herdr has no documented way for a pane command to redirect its own stdout
// into "herdr plugin log list" (that only captures build failures) — so we
// keep our own log file instead of printing results to the visible pane.
// HERDR_PLUGIN_STATE_DIR is unset outside a real plugin run (e.g. tests), in
// which case this silently no-ops rather than writing next to the source.
function logLine(text: string): void {
  const stateDir = process.env.HERDR_PLUGIN_STATE_DIR;
  if (!stateDir) return;
  appendFileSync(join(stateDir, "keymap.log"), `${new Date().toISOString()} ${text}\n`);
}

// HERDR_SOCKET_PATH is already injected by whichever server spawned this
// plugin process — never pass --session here, it would override that.
export function herdr(...args: string[]): any {
  try {
    const out = execFileSync("herdr", args, { encoding: "utf8" });
    const result = JSON.parse(out).result;
    logLine(`ok    herdr ${args.join(" ")} -> ${JSON.stringify(result)}`);
    return result;
  } catch (err) {
    logLine(`error herdr ${args.join(" ")} -> ${(err as Error).message}`);
    throw err;
  }
}

export function currentWorkspaceId(): string {
  const { workspaces } = herdr("workspace", "list");
  const ws = workspaces.find((w: any) => w.focused);
  if (!ws) throw new Error("no focused workspace found");
  return ws.workspace_id;
}

export function currentPane(): any {
  const wsId = currentWorkspaceId();
  const { panes } = herdr("pane", "list", "--workspace", wsId);
  const pane = panes.find((p: any) => p.focused);
  if (!pane) throw new Error("no focused pane found");
  return pane;
}

// Under overlay placement the palette is itself a real, focused pane while
// open, so `--current` (and currentPane()) resolve to the palette, not the
// pane the user came from — splitting the overlay also makes herdr ignore
// --direction. Under the current popup placement this isn't an issue: per
// herdr's socket-api docs, a popup "leaves plugin focus context on the
// underlying tiled pane," so the origin pane stays focused throughout.
// Either way, pane-scoped actions (split/focus/zoom/close_pane) read the
// origin pane from HERDR_PLUGIN_CONTEXT_JSON's `focused_pane_id`, which
// names it under both placements (confirmed from a live overlay invocation;
// documented, not yet independently reproduced live, for popup). NB:
// HERDR_PANE_ID is only set for pane placements (overlay/split/tab/zoomed)
// and holds the palette's own id there — popups don't get one at all — do
// NOT use it here.
export function originPaneId(): string {
  const raw = process.env.HERDR_PLUGIN_CONTEXT_JSON;
  if (raw) {
    const pid = JSON.parse(raw).focused_pane_id;
    if (typeof pid === "string" && pid) return pid;
  }
  // Fail loud rather than fall back to the focused pane (the overlay), which
  // would silently resurrect the wrong-target split bug.
  throw new Error("no focused_pane_id in HERDR_PLUGIN_CONTEXT_JSON");
}

// cwd of the pane the user came from — so new tabs/workspaces start there
// instead of inheriting the palette overlay's cwd (the plugin dir). Undefined
// when unavailable, in which case callers omit --cwd and herdr picks default.
export function originCwd(): string | undefined {
  const raw = process.env.HERDR_PLUGIN_CONTEXT_JSON;
  if (raw) {
    const cwd = JSON.parse(raw).focused_pane_cwd;
    if (typeof cwd === "string" && cwd) return cwd;
  }
  return undefined;
}
