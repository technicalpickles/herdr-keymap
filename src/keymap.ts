import { ExitPromptError } from "@inquirer/core";
import { search } from "@inquirer/prompts";
import { ACTIONS, CATEGORY_ORDER, PaletteBack } from "./actions.ts";
import { loadEffectiveKeys } from "./config.ts";

const EXIT = "__exit__";

const ALL_NAMES = Object.keys(ACTIONS);

// Pad the `[category]` tag to the widest one (not just the key column) so
// descriptions line up in a single column regardless of which category a
// row belongs to — "[tab]" and "[workspace]" differ by 6 characters.
const CATEGORY_WIDTH = Math.max(...CATEGORY_ORDER.map((c) => `[${c}]`.length)) + 1;

// @inquirer/search hardcodes pageSize to 7 regardless of terminal size,
// which wastes space in a popup taller than 7 rows. Size it to the popup
// instead: message line + footer hint + margin for a wrapped line (~4 rows
// total, now that there's no banner) = ~4 rows of chrome; give the rest to
// the list. process.stdout.rows is unset when stdout isn't a TTY (e.g.
// under test or a piped invocation) — fall back to something roomier than
// inquirer's default in that case too.
const CHROME_ROWS = 4;
function computePageSize(): number {
  const rows = process.stdout.rows;
  return rows ? Math.max(7, rows - CHROME_ROWS) : 15;
}

function formatChoice(name: string, keys: Record<string, string>) {
  const entry = ACTIONS[name];
  const key = entry.noKey ? "(cmd)" : keys[name] || "(unassigned)";
  const tag = entry.executor ? "" : `  [${entry.noCli}]`;
  const categoryTag = `[${entry.category}]`.padEnd(CATEGORY_WIDTH);
  return {
    name: `${categoryTag}${key.padEnd(22)} ${entry.description}${tag}`,
    value: name,
  };
}

// @inquirer/prompts' `search` calls this on every keystroke and does no
// filtering itself — it's on us. Plain case-insensitive substring match
// against category/key/description is enough for a ~35-entry static list;
// no fuzzy-match dependency needed.
async function pickAction(keys: Record<string, string>): Promise<string> {
  return search({
    message: "Command",
    pageSize: computePageSize(),
    source: async (term) => {
      const needle = term?.toLowerCase() ?? "";
      const names = needle
        ? ALL_NAMES.filter((n) => {
            const e = ACTIONS[n];
            const haystack = `${e.category} ${n} ${e.description} ${keys[n] ?? ""}`.toLowerCase();
            return haystack.includes(needle);
          })
        : ALL_NAMES;
      return [...names.map((n) => formatChoice(n, keys)), { name: "Exit", value: EXIT }];
    },
  });
}

async function main() {
  const keys = loadEffectiveKeys();

  try {
    while (true) {
      const name = await pickAction(keys);
      if (name === EXIT) break;

      const entry = ACTIONS[name];
      if (!entry.executor) {
        // Keep the palette open so the key stays readable — it grabs all
        // terminal input, so the user must close it before pressing it.
        const key = keys[name];
        console.log(
          key
            ? `'${name}' has no CLI equivalent (${entry.noCli}). Close the palette (Esc), then press: ${key}`
            : `'${name}' has no CLI equivalent (${entry.noCli}) and has no key bound — assign one in config.toml.`,
        );
        continue;
      }
      try {
        await entry.executor();
      } catch (err) {
        // "❮ Back", an empty/declined prompt, or Esc/Ctrl+C inside a sub-prompt
        // all mean "cancel this action" — return to the search list, don't exit.
        if (err instanceof PaletteBack || err instanceof ExitPromptError) continue;
        console.log(`error: ${(err as Error).message}`);
      }
      return; // one command per palette open — reopen (prefix+m) for another
    }
  } catch (err) {
    if (!(err instanceof ExitPromptError)) throw err;
    // clean exit: Esc or Ctrl+C/Ctrl+D at any prompt
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
