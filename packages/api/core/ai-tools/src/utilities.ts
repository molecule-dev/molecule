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
const SECRET_KEYWORDS =
  'SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|PRIVATE_KEY|DATABASE_URL|REDIS_URL|AUTH|CREDENTIAL|ACCESS_KEY|SIGNING_KEY|ENCRYPTION_KEY|CONNECTION_STRING|DSN|SMTP_PASS|_KEY'
const SECRET_KEY_PATTERN = new RegExp(`^(.*(?:${SECRET_KEYWORDS})[A-Z0-9_]*)=(.+)$`, 'gim')
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
 * @param s - Log or command output that may contain `.env`-style secrets.
 * @returns A redacted copy safe to surface to end users or models.
 */
export function redactSecrets(s: string): string {
  return s
    .replace(SECRET_KEY_PATTERN, '$1=[REDACTED]')
    .replace(SECRET_JSON_DQ, jsonValueReplacer('"'))
    .replace(SECRET_JSON_SQ, jsonValueReplacer("'"))
}

// ── Command blocking ──────────────────────────────────────────────────────────

/** Commands that dump environment variables — blocked to prevent secret leakage. */
const BLOCKED_COMMANDS =
  /(?:^|[;&|`]\s*|(?:sh|bash|zsh|dash)\s+-c\s+['"]?\s*)(?:\/usr\/bin\/)?(?:\benv\b|\bprintenv\b|\bexport\s*$|\bset\s*$|\bdeclare\s+-x|cat\s+\/etc\/environment|cat\s+\/root\/\.bashrc|cat\s+\/proc\/\d+\/environ|cat\s+\/proc\/self\/environ|strings\s+\/proc|xargs[^;&|\n]*\/proc\/[^;&|\n]*environ|less\s+\/proc|head\s+\/proc|tail\s+\/proc|xxd\s+\/proc|od\s+\/proc|base64\s+\/proc|dd\s[^\n]*\/proc|sed\s[^\n]*\/proc\/[^\n]*environ|awk\s[^\n]*\/proc\/[^\n]*environ|cp\s[^\n]*\/proc\/[^\n]*environ)/i
/** Block shell redirects from /proc environ. */
const BLOCKED_PROC_REDIRECT = /(?:<\s*\/proc\/(?:\d+|self)\/environ)/i
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
  if (BLOCKED_COMMANDS.test(command))
    return 'Command blocked: environment variable dumps are not allowed'
  if (BLOCKED_PROC_REDIRECT.test(command))
    return 'Command blocked: /proc/environ access is not allowed'
  if (BLOCKED_INTERPRETER_ENV.test(command))
    return 'Command blocked: interpreter environment dumps are not allowed'
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
  return /^[A-Za-z0-9*?._/()[\]-]+$/.test(pattern)
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
  const norm = (s: string): string => s.replace(/\s+/g, ' ').trim()
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
