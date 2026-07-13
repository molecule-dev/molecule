#!/usr/bin/env node
/**
 * Pre-commit secret scan — blocks a commit that would introduce a high-confidence secret.
 *
 * Dependency-free (Node built-ins only) so it works in every repo AND in user-scaffolded
 * projects without installing any binary. Scans only the STAGED, ADDED lines (git diff
 * --cached), so it never trips on pre-existing content or deletions. Patterns mirror the
 * platform's own value-shape redaction rules (security/redact-secrets.ts) — one source of
 * truth for "what a secret looks like".
 *
 * Bypass for a deliberate, reviewed case: `git commit --no-verify`.
 */
import { execSync } from 'node:child_process'
import process from 'node:process'

/** [label, regex] — high-confidence secret value shapes. Keep in sync with redact-secrets.ts. */
const RULES = [
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{16,}/],
  ['OpenAI API key', /\bsk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36}\b/],
  ['GitHub fine-grained PAT', /\bgithub_pat_[A-Za-z0-9_]{22,}\b/],
  ['GitLab PAT', /\bglpat-[A-Za-z0-9_-]{20}\b/],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe live key', /\b[sr]k_live_[0-9a-zA-Z]{16,}/],
  ['Private key block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ['URL credentials', /[a-zA-Z][a-zA-Z0-9+.-]{0,63}:\/\/[^/\s:@]*:[^/\s:@]+@/],
]

let staged
try {
  // --text: FORCE git to emit content even for files it heuristically flags as "binary"
  //   (e.g. a .env with stray NUL bytes) — without it git prints "Binary files differ" and
  //   the secret slips through unscanned. -U0: only changed hunks; --no-color: clean text.
  staged = execSync('git diff --cached --text --no-color --unified=0 --diff-filter=ACM', {
    maxBuffer: 64 * 1024 * 1024,
  }).toString()
} catch (_error) {
  // No staged changes / not a git repo / git unavailable — nothing to scan, allow.
  process.exit(0)
}

/** Hosts that cannot be reached from the internet — a credential aimed at one leaks nothing. */
const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/i
/** Well-known placeholder credential pairs used by dev docs / compose fixtures. */
const PLACEHOLDER_CREDS =
  /^(?:guest:guest|dev:dev|postgres:postgres|root:root|admin:admin|user:password|molecule:molecule|test:test)$/i

/**
 * A URL-credentials match that is provably NOT a secret: every `scheme://creds@host` in the
 * line points at a local host (localhost/127.0.0.1/::1), or carries a well-known placeholder
 * credential pair at a single-label host (a docker-compose service name like `db`, which does
 * not resolve outside the compose network). Anything with a real-looking host or credential —
 * `postgres://u:p@prod.example.com` — is still a hit.
 *
 * Rationale: these appear in package docs (`amqp://guest:guest@localhost:5672/` is RabbitMQ's
 * documented default) and in compose fixtures; without this the gate forces a `--no-verify`
 * habit on every commit that touches them, which is how a REAL secret eventually walks through.
 *
 * @param line - The added line that matched the URL-credentials rule.
 * @returns True when every credential URL on the line is provably non-secret.
 */
function urlCredsAreLocalPlaceholders(line) {
  const matches = [
    ...line.matchAll(
      /[a-zA-Z][a-zA-Z0-9+.-]{0,63}:\/\/([^/\s:@]*):([^/\s:@]+)@([^/\s:?#'"`,)\]]+)/g,
    ),
  ]
  if (matches.length === 0) return false
  return matches.every(([, user, pass, hostPort]) => {
    const host = hostPort.replace(/:\d+$/, '')
    if (LOCAL_HOST.test(host)) return true
    // Single-label host (no dots) = a compose/service name, unreachable off-network — but only
    // excuse it when the credentials are an obvious placeholder pair.
    return !host.includes('.') && PLACEHOLDER_CREDS.test(`${user}:${pass}`)
  })
}

/** This scanner necessarily CONTAINS the shapes it hunts (its rules + their test cases). */
const SELF = /(?:^|\/)(?:precommit-secret-scan\.mjs|precommit-secret-scan\.test\.mjs)$/

let currentFile = null
const hits = []
for (const line of staged.split('\n')) {
  if (line.startsWith('+++ ')) {
    currentFile = line.replace(/^\+\+\+ (b\/)?/, '')
    continue
  }
  // Only ADDED content lines (start with a single '+', not the '+++' header).
  if (line[0] !== '+' || line.startsWith('+++')) continue
  if (currentFile && SELF.test(currentFile)) continue
  const added = line.slice(1)
  for (const [label, re] of RULES) {
    if (!re.test(added)) continue
    if (label === 'URL credentials' && urlCredsAreLocalPlaceholders(added)) continue
    hits.push({ file: currentFile, label, line: added.trim().slice(0, 120) })
  }
}

if (hits.length === 0) process.exit(0)

process.stderr.write('\n[31m✖ pre-commit: blocked — staged changes contain likely secrets:[0m\n')
for (const h of hits) {
  process.stderr.write(`  • [${h.label}] ${h.file}\n      ${h.line}\n`)
}
process.stderr.write(
  '\nMove the secret to a gitignored .env (and rotate it if it was ever real).\n' +
    'If this is a false positive on a non-secret, commit with: git commit --no-verify\n\n',
)
process.exit(1)
