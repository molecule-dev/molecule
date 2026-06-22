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

let currentFile = null
const hits = []
for (const line of staged.split('\n')) {
  if (line.startsWith('+++ ')) {
    currentFile = line.replace(/^\+\+\+ (b\/)?/, '')
    continue
  }
  // Only ADDED content lines (start with a single '+', not the '+++' header).
  if (line[0] !== '+' || line.startsWith('+++')) continue
  const added = line.slice(1)
  for (const [label, re] of RULES) {
    if (re.test(added)) hits.push({ file: currentFile, label, line: added.trim().slice(0, 120) })
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
