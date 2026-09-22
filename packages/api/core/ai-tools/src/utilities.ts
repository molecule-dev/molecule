/**
 * Shared utilities for AI agent tools.
 * Extracted from molecule-dev/api/src/ai/tools.ts for reuse.
 *
 * @module
 */

import { posix } from 'path'

/**
 * Shell-safe quoting using single quotes. Unlike JSON.stringify (double quotes),
 * single-quoted strings prevent command substitution ($(), backticks) and variable expansion.
 *
 * @param s - Raw string to wrap for POSIX shell single-quoted context.
 * @returns A single-quoted shell literal representing `s`.
 */
export function shellQuote(s: string): string {
  // Defensive: a tool handler passing a missing arg (undefined) would otherwise throw
  // the cryptic "Cannot read properties of undefined (reading 'replace')". Fail with a
  // clear message so the surrounding handler's catch reports something actionable.
  if (typeof s !== 'string')
    throw new Error(
      `shellQuote expected a string, received ${s === undefined ? 'undefined' : typeof s}`,
    )
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/**
 * Strip C0 control chars (except tab, newline, CR) that break PostgreSQL JSONB
 * and can cause rendering issues.
 *
 * @param s - Arbitrary text that may contain disallowed control characters.
 * @returns A copy of `s` with unsafe control characters removed.
 */
export const stripControlChars = (s: string): string =>
  // eslint-disable-next-line no-control-regex -- strip C0 controls except tab/LF/CR
  s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

// ── Secret redaction ──────────────────────────────────────────────────────────

/** Keywords that indicate a secret/credential when part of an env var name. */
// Keep aligned with the vault's secret classifier (isSecretKey): a key the vault
// encrypts must also be masked here, or a decrypted secret read from a project's
// .env egresses UNMASKED into stored AI transcripts (a store with different
// access controls than the vault). PWD (DB_PWD/MYSQL_PWD), APIKEY (no underscore,
// e.g. MAILGUN_APIKEY), and SERVICE_ACCOUNT were the gaps; `_KEY` already covers
// OPENAI_KEY / *_ROLE_KEY.
const SECRET_KEYWORDS =
  'SECRET|PASSWORD|PASSWD|PWD|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|DATABASE_URL|REDIS_URL|AUTH|CREDENTIAL|ACCESS_KEY|SIGNING_KEY|ENCRYPTION_KEY|CONNECTION_STRING|SERVICE_ACCOUNT|DSN|SMTP_PASS|_KEY'
/**
 * A keyword-named `NAME=value` anywhere on a line — the ENV-DUMP grade pattern,
 * used by {@link redactSecrets} for command output and `.env` reads. The permissive
 * `.*` prefix is deliberate there: a leaked env var routinely arrives mid-line
 * (`Error: DATABASE_URL=postgres://…` on stderr), and that output is shown to the
 * model but never written back to a file, so over-matching costs nothing.
 *
 * The value must not open with `{` or `<`: an env value never does, but a JSX
 * expression container or element always does. Without that guard this pattern ate
 * `auth={authClient}` down to `auth=[REDACTED]`.
 */
const SECRET_KEY_PATTERN = new RegExp(
  `^(.*(?:${SECRET_KEYWORDS})[A-Za-z0-9_]*)=(?![{<])(.+)$`,
  'gim',
)

/**
 * The same assignment anchored to a REAL env-assignment shape — line start (or
 * `export `), a bare identifier, then `=` with no surrounding spaces. This is the
 * CODE-SAFE form used by {@link redactSecretsInCode}.
 *
 * Anchoring matters because the loose form above matches any line with a keyword
 * anywhere before an `=` and replaces the whole line tail. Over source code that
 * destroyed ordinary lines, and since the executor writes back what it reads, the
 * literal token landed in users' projects.
 */
const SECRET_ENV_ASSIGNMENT = new RegExp(
  // The leading name run allows EMPTY: a name that IS the keyword (`DATABASE_URL=`,
  // `SECRET=`) has nothing before it, and requiring a character there silently
  // un-masked exactly the plainest env vars.
  `^((?:export[ \\t]+)?[A-Za-z0-9_]*(?:${SECRET_KEYWORDS})[A-Za-z0-9_]*)=(?![{<])(.+)$`,
  'gim',
)
/** Catch JSON-formatted env dumps like { KEY: 'value' } from node/python. */
const SECRET_JSON_DQ = new RegExp(
  `(['"]?(?:\\w*(?:${SECRET_KEYWORDS})\\w*)['"]?\\s*[:=]\\s*)"(?:[^"\\\\]|\\\\.)*"`,
  'gi',
)
const SECRET_JSON_SQ = new RegExp(
  `(['"]?(?:\\w*(?:${SECRET_KEYWORDS})\\w*)['"]?\\s*[:=]\\s*)'(?:[^'\\\\]|\\\\.)*'`,
  'gi',
)

/**
 * Exact VALUES that are UI vocabulary, never credentials — kept verbatim even when they
 * sit next to a keyword-looking name. Frontend auth code is full of these: a JSX ternary
 * `autoComplete={mode === "signup" ? "new-password" : "current-password"}` parses to the
 * JSON patterns as name `…password"` : value `"current-password"` and was redacted to
 * `"[REDACTED]"` — corrupting what the model reads back from its own auth files (and any
 * edit_file old_string built from that read can never match).
 */
const NON_SECRET_VALUES = new Set([
  'current-password',
  'new-password',
  'one-time-code',
  'webauthn',
  'password',
  'username',
])

/**
 * Replacer for the JSON-style keyword patterns: masks the quoted value unless it is a
 * known non-secret UI token ({@link NON_SECRET_VALUES}).
 *
 * @param quote - The quote character the value uses (`"` or `'`).
 * @returns A String.replace replacer preserving allowlisted values.
 */
const jsonValueReplacer =
  (quote: '"' | "'") =>
  (match: string, prefix: string): string => {
    const value = match.slice(prefix.length)
    const inner = value.slice(1, -1)
    if (NON_SECRET_VALUES.has(inner.toLowerCase())) return match
    return `${prefix}${quote}[REDACTED]${quote}`
  }

/**
 * Redact values of common secret/credential patterns in text output.
 *
 * ENV-DUMP GRADE — includes the JSON `KEY: 'value'` passes, which key off the
 * NAME beside the value and therefore cannot tell a credential from ordinary
 * code that happens to use a keyword-ish identifier. Use this for `.env` reads
 * and command output (where an env dump is the actual threat); use
 * {@link redactSecretsInCode} for source-file content.
 *
 * @param s - Log or command output that may contain `.env`-style secrets.
 * @returns A redacted copy safe to surface to end users or models.
 */
export function redactSecrets(s: string): string {
  return s
    .replace(SECRET_KEY_PATTERN, '$1=[REDACTED]')
    .replace(SECRET_JSON_DQ, jsonValueReplacer('"'))
    .replace(SECRET_JSON_SQ, jsonValueReplacer("'"))
}

/**
 * CODE-SAFE redaction — the env-assignment pass of {@link redactSecrets} WITHOUT
 * the JSON `KEY: 'value'` passes.
 *
 * Those passes match on the NAME next to a quoted value, so over source code they
 * replace legitimate content at enormous scale: `forgotPasswordEndpoint:
 * '/users/forgot-password'`, `apiKeys: 'API keys'`, and every localized "Show
 * password" string all became `'[REDACTED]'`. Because the agent writes back the
 * content it reads, that token then lands in the user's project — measured at
 * 10,952 of 27,919 flagship template files before this split.
 *
 * No value heuristic can fix that: a legitimate `password = 'TestPass123!'` in a
 * test helper is indistinguishable from a real credential by shape. So the
 * name-keyed passes simply do not run over code. Credentials in source are still
 * caught by the env-assignment pass here, and consumers layer VALUE-SHAPE
 * detection (vendor prefixes, PEM blocks, credentials in a URL authority) on top —
 * which is what actually catches a secret sitting under an innocuous name.
 *
 * @param s - Source-file content or other code-shaped text.
 * @returns A redacted copy that preserves ordinary code verbatim.
 */
export function redactSecretsInCode(s: string): string {
  return s.replace(SECRET_ENV_ASSIGNMENT, '$1=[REDACTED]')
}

/**
 * Whether a path is an env file, for which {@link redactSecrets}' full env-dump
 * treatment is appropriate rather than {@link redactSecretsInCode}. Matches
 * `.env`, `.env.<suffix>`, and `<name>.env`.
 *
 * @param path - A workspace-relative or absolute file path.
 * @returns `true` when the file is an env file.
 */
export function isEnvFilePath(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  return base === '.env' || base.startsWith('.env.') || base.endsWith('.env')
}

/**
 * The time budget a COMMAND declares for itself — a `timeout <seconds>` prefix
 * anywhere in it, or the tool call's own `timeout` (ms) parameter, whichever is
 * larger. Zero when it declares none.
 *
 * @param command - The shell command.
 * @param timeoutParam - The tool call's `timeout` input, in milliseconds.
 * @returns The declared budget in seconds, or 0.
 */
export function declaredBudgetSeconds(command: string, timeoutParam: unknown): number {
  let declared = 0
  for (const m of command.matchAll(
    /(?:^|[;&|]\s*|\s)timeout\s+(?:-[a-zA-Z-]+\s+)*(\d+)(?![\d.])/g,
  )) {
    declared = Math.max(declared, Number(m[1]))
  }
  const asMs = Number(timeoutParam)
  if (Number.isFinite(asMs) && asMs > 0) declared = Math.max(declared, Math.round(asMs / 1000))
  return declared
}

/**
 * Whether a command's output reaches the tool only when the whole pipeline
 * ends — a pipe into `tail`, `grep`, `sort`, `wc` and friends, which
 * block-buffer when stdout is not a terminal.
 *
 * It matters only in combination with an overrun: a command stopped at the
 * tool's ceiling normally hands back everything it printed, but behind one of
 * these it printed nothing, so the whole budget is spent for no information.
 * Measured across six real agent runs: ten such commands, every one of them
 * piped, 49 minutes returning a few hundred bytes each.
 *
 * @param command - The shell command.
 * @returns True when a kill would return no useful output.
 */
export function outputIsWithheldUntilExit(command: string): boolean {
  return /\|\s*(?:tail|head|grep|egrep|fgrep|sort|uniq|wc|jq)\b/.test(command)
}

// ── Command blocking ──────────────────────────────────────────────────────────

/**
 * Commands that dump environment variables — blocked to prevent secret leakage.
 * Also covers reads of `/etc/mol/…` (the molecule platform's secrets dir —
 * `/etc/mol/env` carries the vault + platform secrets inside a sandbox),
 * which is an env-dump by another door.
 *
 * `env` counts only when it DUMPS: bare, or with the `-0` / `--null` output
 * flags, followed by the end of the command or a separator / pipe / redirect.
 * `env -u KEY cmd`, `env KEY=value cmd` and `env -i cmd` run a command with a
 * changed environment and print nothing; an executor reaches for them to prove
 * a keyless build still succeeds, and blocking those sent it looking for
 * workarounds (X0 rehearsal 14).
 */
const BLOCKED_COMMANDS =
  /(?:^|[;&|`]\s*|(?:sh|bash|zsh|dash)\s+-c\s+['"]?\s*)(?:\/usr\/bin\/)?(?:\benv(?:\s+(?:-0|--null|--))?\s*(?:$|[;&|>)`'"])|\bprintenv\b|\bexport\s*$|\bset\s*$|\bdeclare\s+-x|cat\s+\/etc\/environment|cat\s+\/root\/\.bashrc|cat\s+\/proc\/\d+\/environ|cat\s+\/proc\/self\/environ|strings\s+\/proc|xargs[^;&|\n]*\/proc\/[^;&|\n]*environ|less\s+\/proc|head\s+\/proc|tail\s+\/proc|xxd\s+\/proc|od\s+\/proc|base64\s+\/proc|dd\s[^\n]*\/proc|sed\s[^\n]*\/proc\/[^\n]*environ|awk\s[^\n]*\/proc\/[^\n]*environ|cp\s[^\n]*\/proc\/[^\n]*environ|(?:cat|less|head|tail|xxd|od|base64|strings|dd|cp|sed|awk)\s[^\n;&|]*\/etc\/mol(?:\/|\b))/i
/** Block shell redirects from /proc environ. */
const BLOCKED_PROC_REDIRECT = /(?:<\s*\/proc\/(?:\d+|self)\/environ)/i
/** Block shell redirects from the molecule platform secrets dir (`/etc/mol`). */
const BLOCKED_MOL_REDIRECT = /(?:<\s*\/etc\/mol)/i
/** Interpreter-based env dumping (python, node, ruby, perl). */
const BLOCKED_INTERPRETER_ENV =
  /(?:python[23]?|node|ruby|perl)\s+(?:-e|-c)\s+[^\n]*(?:os\.environ|process\.env|ENV\[|%ENV|ENVIRON)/i

/**
 * Check if a command is blocked for security reasons. Returns error message or null if allowed.
 *
 * @param command - Shell command string proposed for execution.
 * @returns A human-readable block reason, or `null` when the command is allowed.
 */
export function checkBlockedCommand(command: string): string | null {
  // These blocks fire when the executor tries to DUMP the environment (usually to discover
  // what managed services are configured). Don't just refuse — redirect: the values are
  // already in the process environment, so it never needs to print them.
  const envDumpSteer =
    ' You do NOT need to dump it: the managed service values (DATABASE_URL, etc.) are already ' +
    'in the process environment — read them IN CODE via process.env / your config loader, or ' +
    "check the project's provisioned env file to see WHICH services exist. Printing them only " +
    'leaks secrets into the transcript.'
  if (BLOCKED_COMMANDS.test(command))
    return `Command blocked: dumping environment variables is not allowed.${envDumpSteer}`
  if (BLOCKED_PROC_REDIRECT.test(command))
    return 'Command blocked: /proc/environ access is not allowed.' + envDumpSteer
  if (BLOCKED_MOL_REDIRECT.test(command))
    return 'Command blocked: /etc/mol (platform secrets) access is not allowed.' + envDumpSteer
  if (BLOCKED_INTERPRETER_ENV.test(command))
    return `Command blocked: dumping the environment from an interpreter is not allowed.${envDumpSteer}`
  return null
}

// ── Path resolution ───────────────────────────────────────────────────────────

/**
 * Normalize a path to be absolute within the project root.
 * Empty string and '/' both resolve to projectRoot.
 * Rejects paths that escape via traversal or absolute paths outside root.
 *
 * @param path - Relative or absolute path inside the workspace.
 * @param projectRoot - Absolute filesystem root for the active project.
 * @returns A normalized absolute path confined to `projectRoot`.
 */
export function resolvePath(path: string, projectRoot: string): string {
  if (path === '' || path === '/') return projectRoot
  const clean = path.replace(/\0/g, '')
  const resolved = clean.startsWith('/')
    ? posix.normalize(clean)
    : posix.normalize(`${projectRoot}/${clean}`)
  if (resolved !== projectRoot && !resolved.startsWith(projectRoot + '/')) return projectRoot
  return resolved
}

/**
 * Validate that a glob/include pattern is safe (no shell metacharacters that could
 * inject). Allows alphanumeric, `* ? . _ - /` and the bracket/paren glob chars `[] ()`.
 *
 * The brackets/parens matter for real frameworks: Next.js App Router names route
 * directories `[id]`, `[...slug]`, `(group)`, `[[...optional]]`, so without them the
 * executor cannot `find_files`/`search_files` its own routes on any Next.js project — a
 * hard block observed on live imports. They are injection-safe here because every caller
 * passes the pattern through `shellQuote` before it reaches `find -name`/`grep --include`,
 * where inside single quotes `[]()` are literal (a subshell `(...)` only starts UNquoted);
 * to the glob engine `[abc]` is a normal character class. The genuinely dangerous
 * metacharacters (`; | & $ \` > < \n` space) remain disallowed.
 *
 * @param pattern - User-supplied glob fragment for search/list operations.
 * @returns `true` when the pattern contains only allowed characters.
 */
export function isValidGlob(pattern: string): boolean {
  // `@` is in the set because every package in this ecosystem is scoped:
  // measured on a live build, the executor tried
  // `node_modules/@molecule/app-ui/*` twice and was refused both times, so in
  // a molecule project it could not glob its own dependencies. The character
  // is inert here — patterns are shell-quoted before they reach find/grep, and
  // `@` has no meaning to either.
  return /^[A-Za-z0-9@*?._/()[\]-]+$/.test(pattern)
}

/**
 * Validate a file tool's `path` argument is a non-empty string. A weak model
 * sometimes omits it or passes a non-string, which would otherwise crash
 * `resolvePath` (`path.replace` on undefined) with the cryptic, unactionable
 * "Cannot read properties of undefined (reading 'replace')" — wasting executor
 * turns. Returns an actionable message, or null when the path is usable.
 *
 * @param path - The raw `path` argument from the tool input.
 * @param tool - The tool name, for the error message (e.g. 'read_file').
 * @returns An actionable error string, or null when `path` is a non-empty string.
 */
export function pathArgError(path: unknown, tool: string): string | null {
  if (typeof path !== 'string' || path.trim() === '')
    return `${tool} requires a non-empty "path" argument (a file path relative to the project root, e.g. "api/src/handlers/index.ts").`
  return null
}

/**
 * Detect a "read/edit targeted a directory, not a file" failure from a backend
 * error message (local fs `EISDIR` or the sandbox's `cat: X: Is a directory`),
 * and return an actionable message steering the model to `list_files`. Returns
 * null when the error is not a directory error.
 *
 * @param message - The backend error message.
 * @param path - The resolved path that was targeted.
 * @returns An actionable directory-error string, or null.
 */
export function directoryReadHint(message: string, path: string): string | null {
  if (/EISDIR|is a directory/i.test(message))
    return `${path} is a directory, not a file. Use list_files to see its contents, then read_file a specific file inside it.`
  return null
}

// ── Output truncation ─────────────────────────────────────────────────────────

/** Max file size for read_file (5MB). */
export const MAX_READ_SIZE = 5 * 1024 * 1024
/** Max content size for write_file (10MB). */
export const MAX_WRITE_SIZE = 10 * 1024 * 1024
/** Max command output size (100KB per stream). */
export const MAX_OUTPUT_SIZE = 100 * 1024
/**
 * Most lines of surrounding context `search_files` will return per match.
 * Bounded so a broad pattern with a generous context cannot pull a whole tree
 * into one reply.
 */
export const MAX_SEARCH_CONTEXT_LINES = 40

/**
 * Return a line window of `content`, or null when no window was asked for.
 *
 * `read_file` returned whole files only, so an executor that wanted part of one
 * shelled out: across six real agent runs, 260 of 377 shell-inspection commands
 * (69%) were `head`/`tail`/`sed -n` windowing a file the tool could have
 * windowed itself. `offset` is 1-based, matching the line numbers every other
 * tool reports and what `grep -n` prints.
 *
 * @param content - The file's full text.
 * @param window - The requested `offset` (1-based) and `limit` (line count).
 * @returns The window plus its position, or null when neither was given.
 */
export function sliceLines(
  content: string,
  window?: { offset?: unknown; limit?: unknown },
): { text: string; offset: number; lines: number; totalLines: number; truncated: boolean } | null {
  const rawOffset = Number(window?.offset)
  const rawLimit = Number(window?.limit)
  const hasOffset = Number.isFinite(rawOffset) && rawOffset !== 0
  const hasLimit = Number.isFinite(rawLimit) && rawLimit > 0
  if (!hasOffset && !hasLimit) return null

  const all = content.split('\n')
  const totalLines = all.length
  // A NEGATIVE offset counts from the end, the `tail -N` convention. Without it
  // "show me the last 30 lines" has no expression here, and the executor either
  // reads the whole file or goes back to the shell — measured: asked for a
  // file's tail with these tools available, it read the entire file 3 times out
  // of 3 until this existed.
  const fromEnd = hasOffset && rawOffset < 0
  const offset = fromEnd
    ? Math.max(1, totalLines + Math.trunc(rawOffset) + 1)
    : hasOffset
      ? Math.min(Math.trunc(rawOffset), totalLines)
      : 1
  const limit = hasLimit ? Math.trunc(rawLimit) : totalLines - offset + 1
  const picked = all.slice(offset - 1, offset - 1 + limit)
  return {
    text: picked.join('\n'),
    offset,
    lines: picked.length,
    totalLines,
    truncated: offset > 1 || offset - 1 + picked.length < totalLines,
  }
}

/** Max search results. */
/**
 * Most files one batched `read_file` call returns. The cap exists so a survey
 * of a large tree cannot swallow the turn's context in one result; the tool
 * reports where it stopped so the model continues from there.
 */
export const MAX_BATCH_READ_FILES = 25

/**
 * Total content bytes one batched `read_file` call returns, across all files.
 * The per-file {@link MAX_READ_SIZE} still applies to each one.
 */
export const MAX_BATCH_READ_BYTES = 200 * 1024

/**
 * The most one read_file call returns for ONE file when no window was asked
 * for, in chars. Larger files come back as their first window with a note
 * saying how to read the rest.
 *
 * MAX_READ_SIZE (5 MB) is a bound on what the tool will open, not on what it
 * should hand a model: a single batched read that returned a 1.2 MB README
 * put the next three provider calls at 366k tokens (~330k of them fresh)
 * against a 120k-token context cap (X0 run x5, call 26). ~80 KB is ~20–25k
 * tokens — a fifth of that cap, and more than any one file read usually
 * needs.
 */
export const MAX_READ_RETURN_CHARS = 80 * 1024

/** Max search results. */
export const MAX_SEARCH_RESULTS = 50
/** Max find results. */
export const MAX_FIND_RESULTS = 100

/**
 * Default directory names `search_files`/`find_files` skip — VS Code's
 * `search.exclude` + `files.exclude` defaults (node_modules, bower_components,
 * VCS dirs) plus the platform's vendored/build dirs. Overridable per consumer
 * via `ToolBuildConfig.searchExcludedDirs` (a per-project, user-editable
 * setting in molecule.dev — keep the APP-SIDE copy in
 * `@molecule/app-ide-react`'s search types in sync with this list).
 */
export const DEFAULT_SEARCH_EXCLUDED_DIRS = [
  'node_modules',
  'bower_components',
  '.git',
  '.svn',
  '.hg',
  'CVS',
  'dist',
  '.next',
  '.vite',
  'molecule',
] as const

/**
 * Truncate a string to a max length with a truncation notice.
 *
 * @param s - Arbitrary text to bound in size.
 * @param maxLength - Maximum number of characters to retain before truncating.
 * @returns Either the original string or a shortened copy with a trailing notice.
 */
export function truncate(s: string, maxLength: number): string {
  if (s.length <= maxLength) return s
  return s.substring(0, maxLength) + '\n\n... (truncated)'
}

/**
 * Truncate keeping BOTH the head and the tail, eliding the middle — for command
 * output (build / test / migration / install logs). Plain head truncation
 * ({@link truncate}) drops the TAIL, which is exactly where a failing command puts
 * the reason: the `npm ERR!` line, the test-failure summary (`1 failed, 240
 * passed`), the migration stack trace. When that is cut, the executor sees only
 * passing progress and can't tell WHY the command failed — a self-inflicted error
 * then survives every fix round. The head still shows what ran and the first
 * errors; the split is weighted toward the tail since the summary lives there.
 * No-op when `s` already fits.
 *
 * @param s - Arbitrary text (typically stdout/stderr) to bound in size.
 * @param maxLength - Maximum characters to retain (excluding the elision notice).
 * @returns The original string, or head + an elision notice + tail.
 */
export function truncateMiddle(s: string, maxLength: number): string {
  if (s.length <= maxLength) return s
  // Reserve room for the elision notice so head + notice + tail stays WITHIN
  // maxLength — the cap is a real token budget the caller relies on (a head-only
  // truncate that overshoots by its suffix length breaks that contract). 140 =
  // the fixed notice text (~124) + up to ~12 digits for the omitted count.
  const noticeReserve = 140
  // Cap too small to fit the notice + any head/tail → plain head slice (still
  // within maxLength; the middle-preserving form only helps at real sizes).
  if (maxLength <= noticeReserve) return s.slice(0, maxLength)
  const budget = maxLength - noticeReserve
  const headLen = Math.floor(budget * 0.4)
  const tailLen = budget - headLen
  const omitted = s.length - headLen - tailLen
  return (
    s.slice(0, headLen) +
    `\n\n... [middle truncated — ${omitted} chars omitted; the head AND the tail are shown, a failing command's error is usually near the end] ...\n\n` +
    s.slice(s.length - tailLen)
  )
}

/**
 * Attempt a whitespace-tolerant replacement when an exact `old_string` match
 * failed. Finds a contiguous run of lines in `content` whose per-line
 * whitespace-normalized form (runs of whitespace collapsed to one space, then
 * trimmed) equals the normalized `oldString` lines, and replaces that run with
 * `newString` verbatim. Applies ONLY when exactly one such run exists —
 * uniqueness keeps it safe; an ambiguous (or zero) match is refused (returns
 * null) so the caller falls back to its existing error path.
 *
 * This rescues the most common edit_file failure: a (weak) executor reproduces
 * the target text correctly but with different indentation or trailing
 * whitespace, which would otherwise bounce it into a re-read/retry loop — the
 * single biggest source of wasted edit turns.
 *
 * @param content - Current file content.
 * @param oldString - The search text (an exact match has already failed).
 * @param newString - The replacement text, applied verbatim.
 * @returns The new content if a unique fuzzy run matched, else null.
 */
export function whitespaceTolerantReplace(
  content: string,
  oldString: string,
  newString: string,
): string | null {
  // Per-line normalization: runs of whitespace become one space, and spaces
  // next to punctuation are dropped entirely. The second rule is for the edit
  // a weak executor makes from memory with one space missing —
  // `readdirSync,readFileSync` against a file that reads
  // `readdirSync, readFileSync` (X0 run x6: 15 of 48 edits failed, most of
  // them this shape, after the file's exact text had left the context). A
  // missing space is zero whitespace, which the runs rule cannot see. This
  // only decides WHERE the block is; the replacement text is applied
  // verbatim, and uniqueness is still required.
  const norm = (s: string): string =>
    s
      .replace(/\s*([,;:{}()[\]=<>.])\s*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  const fileLines = content.split('\n')
  const normOld = oldString.split('\n').map(norm)
  // Refuse a degenerate all-blank search block (would match any blank run).
  if (normOld.length === 0 || normOld.every((l) => l === '')) return null
  const matches: number[] = []
  for (let i = 0; i + normOld.length <= fileLines.length; i++) {
    let ok = true
    for (let j = 0; j < normOld.length; j++) {
      if (norm(fileLines[i + j]) !== normOld[j]) {
        ok = false
        break
      }
    }
    if (ok) {
      matches.push(i)
      if (matches.length > 1) return null // ambiguous — refuse
    }
  }
  if (matches.length !== 1) return null
  const start = matches[0]
  return [...fileLines.slice(0, start), newString, ...fileLines.slice(start + normOld.length)].join(
    '\n',
  )
}

/** Files a parse check can vouch for cheaply right after a write. */
export const PARSE_CHECKABLE = /\.(m?js|cjs|jsx|ts|tsx|mts|cts|json)$/

/**
 * The shell command that parses one file and exits non-zero with the error
 * when it does not parse: `node --check` for JavaScript, `JSON.parse` for
 * JSON, esbuild's transform (present wherever Vite is) for TypeScript.
 *
 * @param path - The file's absolute path.
 * @returns The command, or null when the file type has no cheap parser.
 */
export function parseCheckCommand(path: string): string | null {
  if (!PARSE_CHECKABLE.test(path)) return null
  const q = shellQuote(path)
  if (/\.(m?js|cjs)$/.test(path)) return `node --check ${q}`
  if (/\.json$/.test(path))
    return `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" ${q}`
  return (
    `node -e "const p=process.argv[1];const src=require('fs').readFileSync(p,'utf8');` +
    `require('esbuild').transformSync(src,{loader:p.endsWith('x')?'tsx':'ts',logLevel:'silent'})" ${q}`
  )
}

/**
 * What a failed parse check says to the executor, or null when the check
 * passed or could not run (no parser available is not a syntax error).
 *
 * @param result - The check command's result.
 * @returns The message for the tool result, or null.
 */
export function parseCheckProblem(result: {
  stdout: string
  stderr: string
  exitCode: number
}): string | null {
  if (result.exitCode === 0) return null
  const text = (result.stderr || result.stdout).trim()
  if (/Cannot find module|not found/i.test(text) && !/SyntaxError/.test(text)) return null
  return text.slice(0, 1200)
}
