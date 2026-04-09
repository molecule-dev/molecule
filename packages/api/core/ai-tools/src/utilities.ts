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
 */
export function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/**
 * Strip C0 control chars (except tab, newline, CR) that break PostgreSQL JSONB
 * and can cause rendering issues.
 */
// eslint-disable-next-line no-control-regex
export const stripControlChars = (s: string): string => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

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

/** Redact values of common secret/credential patterns in text output. */
export function redactSecrets(s: string): string {
  return s
    .replace(SECRET_KEY_PATTERN, '$1=[REDACTED]')
    .replace(SECRET_JSON_DQ, '$1"[REDACTED]"')
    .replace(SECRET_JSON_SQ, "$1'[REDACTED]'")
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

/** Check if a command is blocked for security reasons. Returns error message or null if allowed. */
export function checkBlockedCommand(command: string): string | null {
  if (BLOCKED_COMMANDS.test(command)) return 'Command blocked: environment variable dumps are not allowed'
  if (BLOCKED_PROC_REDIRECT.test(command)) return 'Command blocked: /proc/environ access is not allowed'
  if (BLOCKED_INTERPRETER_ENV.test(command)) return 'Command blocked: interpreter environment dumps are not allowed'
  return null
}

// ── Path resolution ───────────────────────────────────────────────────────────

/**
 * Normalize a path to be absolute within the project root.
 * Empty string and '/' both resolve to projectRoot.
 * Rejects paths that escape via traversal or absolute paths outside root.
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
 * Validate that a glob/include pattern is safe (no shell metacharacters).
 * Only allows alphanumeric, *, ?, ., _, -, / characters.
 */
export function isValidGlob(pattern: string): boolean {
  return /^[a-zA-Z0-9*?._\-/]+$/.test(pattern)
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

/** Truncate a string to a max length with a truncation notice. */
export function truncate(s: string, maxLength: number): string {
  if (s.length <= maxLength) return s
  return s.substring(0, maxLength) + '\n\n... (truncated)'
}
