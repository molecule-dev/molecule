/**
 * Pure helpers backing the `/scripts` browser and the `/run <name>` command.
 *
 * Scripts are saved shell files under the project's `.agents/scripts/` tree
 * (`.agents/scripts/<name>.sh`) carrying a YAML frontmatter header (`name`,
 * `description`, `createdAt`). The UI lists them via `GET /projects/:id/scripts`,
 * runs one via `POST /projects/:id/scripts/:name/run`, and saves a new one (e.g.
 * one the agent just generated) via `POST /projects/:id/scripts`.
 *
 * These helpers parse the slash commands, normalize a script name into the safe
 * filename base the backend expects, resolve a typed `/run` argument against the
 * known scripts, filter the list for the browser, and assemble a run's raw
 * output for display. They are deterministic and side-effect free so they can be
 * unit tested without rendering or a real backend. Any user-facing prose
 * (status labels, empty states) lives in the components via `t()`, never here —
 * `formatRunOutput` returns only the command's own (untranslatable) stdout/stderr.
 *
 * @module
 */

/** A saved project script's metadata (the body lives in the sandbox file). */
export interface ScriptInfo {
  /** Script name — the `<name>` in `.agents/scripts/<name>.sh` (no extension). */
  name: string
  /** One-line description (from the script's YAML frontmatter `description`). */
  description: string
  /** ISO 8601 creation timestamp (frontmatter `createdAt`). */
  createdAt: string
}

/** The result of running a script via the sandbox `exec`. */
export interface ScriptRunResult {
  /** Captured standard output. */
  stdout: string
  /** Captured standard error. */
  stderr: string
  /** Process exit code (`0` = success). */
  exitCode: number
}

/** The `POST /projects/:id/scripts` request body for saving a script. */
export interface SaveScriptPayload {
  /** Normalized script name (the filename base, no `.sh`). */
  name: string
  /** One-line description stored in the frontmatter header. */
  description: string
  /** The shell script body. */
  body: string
}

/**
 * Normalizes a raw, possibly user- or AI-supplied script name into the safe
 * filename base the backend writes as `.agents/scripts/<name>.sh`: lowercased,
 * a trailing `.sh` dropped, every run of disallowed characters collapsed to a
 * single `-`, and leading/trailing `-` trimmed. Returns `''` when nothing usable
 * remains (the caller should treat that as invalid).
 *
 * @param raw - The raw script name (e.g. `'Run Tests.sh'`).
 * @returns The normalized base name (e.g. `'run-tests'`), or `''`.
 */
export function normalizeScriptName(raw: string): string {
  return raw
    .trim()
    .replace(/\.sh$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Parses a `/scripts [query]` command. Returns the (possibly empty) trimmed
 * filter query when the input is the `/scripts` command, else `null`.
 *
 * @param input - The raw chat input.
 * @returns `{ query }` when it's a `/scripts` command, else `null`.
 */
export function parseScriptsCommand(input: string): { query: string } | null {
  const match = input.trim().match(/^\/scripts(?:\s+(.*))?$/i)
  if (!match) return null
  return { query: (match[1] ?? '').trim() }
}

/**
 * Parses a `/run [name]` command. Returns the (possibly empty) trimmed script
 * name when the input is the `/run` command, else `null`. An empty `name`
 * signals `/run` was typed without an argument.
 *
 * @param input - The raw chat input.
 * @returns `{ name }` when it's a `/run` command, else `null`.
 */
export function parseRunCommand(input: string): { name: string } | null {
  const match = input.trim().match(/^\/run(?:\s+(.*))?$/i)
  if (!match) return null
  return { name: (match[1] ?? '').trim() }
}

/**
 * Resolves a `/run` name argument against the known scripts. Tries, in order:
 * exact (case-insensitive, `.sh`-insensitive) match, then a unique prefix match,
 * then a unique substring match. Returns `undefined` when there is no match or
 * the match is ambiguous (more than one prefix/substring candidate).
 *
 * @param scripts - The known scripts.
 * @param name - The raw name argument (may include a `.sh` suffix).
 * @returns The single matching script, or `undefined`.
 */
export function findScriptByName(
  scripts: readonly ScriptInfo[],
  name: string,
): ScriptInfo | undefined {
  const q = normalizeScriptName(name)
  if (!q) return undefined
  const exact = scripts.find((s) => normalizeScriptName(s.name) === q)
  if (exact) return exact
  const prefix = scripts.filter((s) => normalizeScriptName(s.name).startsWith(q))
  if (prefix.length === 1) return prefix[0]
  if (prefix.length > 1) return undefined
  const substring = scripts.filter((s) => normalizeScriptName(s.name).includes(q))
  return substring.length === 1 ? substring[0] : undefined
}

/**
 * Filters scripts by a free-text query, matching (case-insensitively) against
 * the name and description. An empty/blank query returns all scripts in input
 * order.
 *
 * @param scripts - The scripts to filter.
 * @param query - The search query.
 * @returns The matching scripts, in input order.
 */
export function filterScripts(scripts: readonly ScriptInfo[], query: string): ScriptInfo[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...scripts]
  return scripts.filter(
    (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
  )
}

/**
 * Assembles a run's raw output for display: stdout followed by stderr (each
 * trimmed of trailing whitespace), joined by a blank line when both are present.
 * Returns `''` when the run produced no output — the component decides how to
 * render an empty result. Contains no translatable prose; the exit-status label
 * is rendered separately by the component via `t()`.
 *
 * @param result - The script run result.
 * @returns The combined stdout/stderr text (possibly empty).
 */
export function formatRunOutput(result: ScriptRunResult): string {
  const out = (result.stdout ?? '').replace(/\s+$/, '')
  const err = (result.stderr ?? '').replace(/\s+$/, '')
  if (out && err) return `${out}\n\n${err}`
  return out || err
}

/**
 * Whether a run succeeded (exit code `0`).
 *
 * @param result - The script run result.
 * @returns `true` when `exitCode === 0`.
 */
export function runSucceeded(result: ScriptRunResult): boolean {
  return result.exitCode === 0
}

/**
 * Builds the `POST /projects/:id/scripts` body from raw form/AI input,
 * normalizing the name and trimming the description and body. The backend adds
 * the YAML frontmatter header (`name`, `description`, `createdAt`); the body
 * here is the script content only.
 *
 * @param input - The raw `{ name, description, body }` to save.
 * @returns The normalized save payload.
 */
export function buildSaveScriptPayload(input: {
  name: string
  description: string
  body: string
}): SaveScriptPayload {
  return {
    name: normalizeScriptName(input.name),
    description: input.description.trim(),
    body: input.body.replace(/\s+$/, ''),
  }
}

/**
 * Whether a save payload has the minimum required fields: a non-empty
 * normalized name and a non-empty body.
 *
 * @param payload - The save payload to validate.
 * @returns `true` when the payload can be saved.
 */
export function isSaveScriptValid(payload: SaveScriptPayload): boolean {
  return payload.name.length > 0 && payload.body.trim().length > 0
}
