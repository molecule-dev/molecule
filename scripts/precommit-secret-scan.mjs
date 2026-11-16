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
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

/** [label, regex] — high-confidence secret value shapes. Keep in sync with redact-secrets.ts. */
const RULES = [
  [
    'Fly API token',
    /\bFlyV1[ \t]+fm[0-9]+_[A-Za-z0-9_+/=-]{16,}(?:,[ \t]*fm[0-9]+_[A-Za-z0-9_+/=-]{16,})*/,
  ],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{16,}/],
  ['OpenAI API key', /\bsk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36}\b/],
  ['GitHub fine-grained PAT', /\bgithub_pat_[A-Za-z0-9_]{22,}\b/],
  ['GitLab PAT', /\bglpat-[A-Za-z0-9_-]{20}\b/],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe live key', /\b[sr]k_live_[0-9a-zA-Z]{16,}/],
  // Stripe webhook signing secret. Real ones are `whsec_` + 24+ alphanumeric
  // chars. `_` is deliberately NOT in the class: every `whsec_` already
  // committed in this tree is a self-describing test constant
  // (`whsec_unused_in_this_spec`, `whsec_capability_contract_secret`) whose
  // underscores break the run, so the rule only ever matches a shape-valid
  // value. (Audit 2026-09-17.)
  ['Stripe webhook signing secret', /\bwhsec_[0-9A-Za-z]{20,}/],
  // npm granular access token. Added 2026-08-04, before the first @molecule/*
  // publish: the natural place to put one is `.npmrc`, and molecule/.npmrc is
  // TRACKED in a PUBLIC repo — so the obvious misstep was a world-readable
  // publish credential for the whole scope, with nothing here to catch it.
  ['npm access token', /\bnpm_[A-Za-z0-9]{36}\b/],
  // Any registry auth line carrying a real value (placeholders/${VAR} excluded
  // below). Catches classic UUID-style tokens, which have no distinctive prefix.
  ['npm registry authToken', /_authToken\s*=\s*(?!\s*[$<{])["']?[A-Za-z0-9_\-.]{16,}/],
  ['Private key block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ['URL credentials', /[a-zA-Z][a-zA-Z0-9+.-]{0,63}:\/\/[^/\s:@]*:[^/\s:@]+@/],
]

/**
 * [label, regex] — rules of gitleaks' default set whose shape is wider than the matching rule
 * above. They apply only in a repo whose root has a `.gitleaks.toml` (its CI runs gitleaks), and
 * only where that CI scan would report them: outside the file's allowlisted `paths`, and not when
 * the match is one of its allowlisted `regexes` or contains one of its `stopwords`. Without them a
 * value passes this hook and fails CI: `sk_live_` plus 12 characters is under the 16 of "Stripe
 * live key" and over the 10 of gitleaks' `stripe-access-token`.
 */
const GITLEAKS_RULES = [
  [
    'Stripe key (gitleaks stripe-access-token)',
    /\b(?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99}(?=[`'"\s;]|\\[nr]|$)/g,
  ],
]

/**
 * Compiles one `.gitleaks.toml` pattern (Go RE2 syntax) as a JavaScript regex. A leading `(?i)`
 * becomes the `i` flag.
 *
 * @param source - The pattern as written in the file.
 * @returns The regex, or `null` (with a warning) when JavaScript cannot compile it.
 */
function compileGitleaksPattern(source) {
  const insensitive = source.startsWith('(?i)')
  try {
    return new RegExp(insensitive ? source.slice(4) : source, insensitive ? 'i' : '')
  } catch (error) {
    process.stderr.write(
      `pre-commit: .gitleaks.toml pattern ${source} is not a JavaScript regex (${error.message}); this scan does not apply it\n`,
    )
    return null
  }
}

/**
 * The allowlist of the repo's `.gitleaks.toml`: the `paths`, `regexes` and `stopwords` of its
 * `[allowlist]` (or `[[allowlists]]`) tables. Strings are read as TOML literals (`'''…'''`,
 * `'…'`) or basic strings (`"…"`), one or more per line; comment lines are skipped.
 *
 * @returns `null` when the repo has no `.gitleaks.toml`, else its allowlist.
 */
function readGitleaksAllowlist() {
  let root
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  } catch (_error) {
    // Not inside a work tree: the staged diff below exits for that case before any line is read.
    return null
  }
  const file = join(root, '.gitleaks.toml')
  if (!existsSync(file)) return null
  const allow = { paths: [], regexes: [], stopwords: [] }
  let inAllowlist = false
  let key = null
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue
    const header = line.match(/^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*$/)
    if (header) {
      inAllowlist = header[1] === 'allowlist' || header[1] === 'allowlists'
      key = null
      continue
    }
    if (!inAllowlist) continue
    const assignment = line.match(/^\s*([A-Za-z_]+)\s*=/)
    if (assignment) key = assignment[1] in allow ? assignment[1] : null
    if (!key) continue
    for (const [, triple, basic, literal] of line.matchAll(
      /'''(.*?)'''|"((?:[^"\\]|\\.)*)"|'([^']*)'/g,
    )) {
      allow[key].push(triple ?? (basic === undefined ? literal : JSON.parse(`"${basic}"`)))
    }
  }
  return {
    paths: allow.paths.map(compileGitleaksPattern).filter(Boolean),
    regexes: allow.regexes.map(compileGitleaksPattern).filter(Boolean),
    stopwords: allow.stopwords.map((word) => word.toLowerCase()),
  }
}

let staged
try {
  // --text: FORCE git to emit content even for files it heuristically flags as "binary"
  //   (e.g. a .env with stray NUL bytes) — without it git prints "Binary files differ" and
  //   the secret slips through unscanned. -U0: only changed hunks; --no-color: clean text.
  //
  // MOL_PRECOMMIT_BASE: a private-index attempt (commit-staged-paths.mjs) pins the
  // commit its index was built on. Live HEAD may move while that hook runs, and
  // diffing the pinned index against the NEW HEAD adds back lines the peer just
  // removed — a false positive on content this commit does not introduce.
  const base = process.env.MOL_PRECOMMIT_BASE
  staged = execFileSync(
    'git',
    [
      'diff',
      '--cached',
      ...(base ? [base] : []),
      '--text',
      '--no-color',
      '--unified=0',
      '--diff-filter=ACM',
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString()
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

/**
 * A URL-credentials match whose credentials are an UNEXPANDED interpolation
 * placeholder — `${VAR}`, `$VAR`, `<PLACEHOLDER>`, `{{var}}` or `%VAR%` — in the
 * user or password position. A literal secret cannot contain those delimiters, so
 * this shape is always documentation or a template showing where a token goes
 * (`https://oauth2:${TOKEN}@github.com/...`), never the token itself.
 *
 * Unlike the local-host exemption above this one ignores the host entirely: the
 * point of such a line is precisely to name a real remote host while keeping the
 * credential symbolic.
 *
 * Why it exists: without it, the only way to document how to set a tokened clone
 * URL is `--no-verify`, and a gate people routinely bypass is how a real key
 * eventually walks through. Keeping the false-positive rate at zero is what makes
 * the block meaningful.
 *
 * @param line - The added line that matched the URL-credentials rule.
 * @returns True when every credential pair on the line is an interpolation placeholder.
 */
function urlCredsAreInterpolationPlaceholders(line) {
  const matches = [...line.matchAll(/[a-zA-Z][a-zA-Z0-9+.-]{0,63}:\/\/([^/\s:@]*):([^/\s:@]+)@/g)]
  if (matches.length === 0) return false
  const placeholder =
    /\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|<[^>]*>|\{\{[^}]*\}\}|%[A-Za-z_][A-Za-z0-9_]*%/
  return matches.every(([, user, pass]) => placeholder.test(user) || placeholder.test(pass))
}

/**
 * A private-key-block match that is provably NOT key material: every PEM header
 * on the line is immediately terminated by a string-literal quote (`'`, `"`, or
 * a backtick). A string that ENDS at the header cannot contain the key body —
 * this is the shape of test assertions (`expect(pem).toContain('-----BEGIN
 * PRIVATE KEY-----')`) on keys generated at runtime. A real leaked key's header
 * line is bare (a PEM file) or continues with `\n`+base64 inside the same
 * literal — neither is excused.
 *
 * @param line - The added line that matched the private-key-block rule.
 * @returns True when every PEM header on the line terminates its string literal.
 */
function pemHeadersAreQuoteTerminated(line) {
  const matches = [
    ...line.matchAll(/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----(.?)/g),
  ]
  if (matches.length === 0) return false
  return matches.every(([, next]) => next === "'" || next === '"' || next === '`')
}

/**
 * This scanner necessarily CONTAINS the shapes it hunts (its rules + their test cases).
 * `.mjs.tpl` is the same file again — mlcl's scaffold template, copied verbatim into every
 * generated project — and without it the scanner blocks the commit that updates itself.
 */
const SELF = /(?:^|\/)precommit-secret-scan(?:\.test)?\.mjs(?:\.tpl)?$/

const gitleaks = readGitleaksAllowlist()

/**
 * Whether CI's gitleaks scan would report this match: its path is not allowlisted, and the match
 * is neither an allowlisted regex nor contains a stopword.
 *
 * @param file - The repo-relative path of the staged file.
 * @param secret - The matched value.
 * @returns True when gitleaks would report it.
 */
function gitleaksReports(file, secret) {
  if (!gitleaks || gitleaks.paths.some((re) => re.test(file ?? ''))) return false
  if (gitleaks.regexes.some((re) => re.test(secret))) return false
  const lower = secret.toLowerCase()
  return !gitleaks.stopwords.some((word) => lower.includes(word))
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
  if (currentFile && SELF.test(currentFile)) continue
  const added = line.slice(1)
  const before = hits.length
  for (const [label, re] of RULES) {
    if (!re.test(added)) continue
    if (label === 'URL credentials' && urlCredsAreLocalPlaceholders(added)) continue
    if (label === 'URL credentials' && urlCredsAreInterpolationPlaceholders(added)) continue
    if (label === 'Private key block' && pemHeadersAreQuoteTerminated(added)) continue
    hits.push({ file: currentFile, label, line: added.trim().slice(0, 120) })
  }
  if (hits.length > before || !gitleaks) continue
  for (const [label, re] of GITLEAKS_RULES) {
    if ([...added.matchAll(re)].some(([secret]) => gitleaksReports(currentFile, secret)))
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
