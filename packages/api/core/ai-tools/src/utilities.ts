/**
 * Shared utilities for AI agent tools.
 * Extracted from molecule-dev/api/src/ai/tools.ts for reuse.
 *
 * @module
 */

import { posix } from 'path'

import {
  type CommandSegment,
  commandSegments,
  locatedCommandSegments,
  statementArgumentEnd,
  withoutTimeoutWrapper,
} from './command-position.js'
import { classifyRunFailure, type RunFailureKind } from './failure-kind.js'
import { commandRunsNoTests } from './no-test-run.js'
import {
  type DiagnosisRunContext,
  isDiagnosisRun,
  type RunEnvSetting,
  scopedRerunCommand,
  suiteCommandTarget,
  suiteRunInTheWay,
  withoutHeredocs,
  withSuiteConfig,
} from './suite-overlap.js'

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
// AUTH but not AUTHOR (usernames printed as `author=…` were masked, X1 flash-m44); AUTHORIZATION still counts.
const SECRET_KEYWORDS =
  'SECRET|PASSWORD|PASSWD|PWD|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|DATABASE_URL|REDIS_URL|AUTH(?!OR(?!IZ))|CREDENTIAL|ACCESS_KEY|SIGNING_KEY|ENCRYPTION_KEY|CONNECTION_STRING|SERVICE_ACCOUNT|DSN|SMTP_PASS|_KEY'
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
  // A value ends at its closing quote OR the end of its line: cut off mid-value (`head -c`),
  // the old pattern ran on to a quote on a LATER line and swallowed the lines between (flash-m32).
  // The key starts at a real boundary: a package name ending in a keyword ("@molecule/app-auth": "1.2.0")
  // is not a secret, and matching from its tail masked the version (flash-m35).
  `((?<![\\w@/.-])['"]?(?:\\w*(?:${SECRET_KEYWORDS})\\w*)['"]?\\s*[:=]\\s*)"(?:[^"\\\\\\n]|\\\\.)*(?:"|(?=\\n)|$)`,
  'gi',
)
const SECRET_JSON_SQ = new RegExp(
  `((?<![\\w@/.-])['"]?(?:\\w*(?:${SECRET_KEYWORDS})\\w*)['"]?\\s*[:=]\\s*)'(?:[^'\\\\\\n]|\\\\.)*(?:'|(?=\\n)|$)`,
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
  (match: string, prefix: string, offset: number, whole: string): string => {
    const value = match.slice(prefix.length)
    const inner = value.slice(1, -1)
    // A TypeScript type literal is never a credential: `type AuthState = 'authenticated' | …`
    // (X1 flash-m58). A union member is followed by `|`; a declaration starts `type`.
    if (/^\s*\|/.test(whole.slice(offset + match.length))) return match
    if (/\btype\s+$/.test(whole.slice(Math.max(0, offset - 16), offset))) return match
    // An empty value hides nothing, and a suite fixture's `"password": ""` is the fact a
    // failing assertion turns on (X1 flash-m52).
    // A version (`"jsonwebtoken": "9.0.2"`, a package name that holds a keyword) is not a
    // credential, and a masked one hid which version is installed (X1 flash-m57).
    if (/^[\^~]?\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(inner)) return match
    if (inner === '' || NON_SECRET_VALUES.has(inner.toLowerCase())) return match
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

/** Source-file extensions a printing command's output is read as code for. */
const SOURCE_FILE_RE = /\.(?:[cm]?[jt]sx?|css|scss|html|vue|svelte|md|sql|hurl)$/

/**
 * A literal argument, not a shell expansion. The shared parser owns statement boundaries;
 * this deliberately small word grammar only decides whether an argument can read other data.
 *
 * @param word - One argument with its original quotes.
 * @returns Its literal value, or null for syntax requiring shell interpretation.
 */
function sourceReadLiteral(word: string): string | null {
  if (/[$`]/.test(word)) return null
  if (/^'[^']*'$/.test(word)) return word.slice(1, -1)
  if (/^"(?:[^"\\]|\\.)*"$/.test(word)) {
    return word.slice(1, -1).replace(/\\(["\\])/g, '$1')
  }
  return /^[a-zA-Z0-9_./:@%+,=-]+$/.test(word) ? word : null
}

/** Read/format options only: no recursive traversal, program execution or auxiliary files. */
const SOURCE_PRINT_OPTIONS: Record<string, { flags: RegExp; values: readonly string[] }> = {
  cat: { flags: /^-[AbeEnstTv]+$/, values: [] },
  head: { flags: /^(?:-\d+|-[qv]|-[nc]\d+|--(?:lines|bytes)=\d+)$/, values: ['-n', '-c'] },
  tail: { flags: /^(?:-\d+|-[qv]|-[nc]\+?\d+|--(?:lines|bytes)=\+?\d+)$/, values: ['-n', '-c'] },
  nl: { flags: /^-b[ant]$/, values: ['-b', '-d', '-f', '-h', '-i', '-l', '-n', '-s', '-v', '-w'] },
  grep: { flags: /^(?:-[nEHhivwxFobcsq]+|-[ABC]\d+)$/, values: ['-A', '-B', '-C'] },
  rg: { flags: /^(?:-[nHhivwxFocqs]+|-[ABC]\d+)$/, values: ['-A', '-B', '-C'] },
  sort: { flags: /^-[bdfgimnruVz]+$/, values: ['-k', '-t'] },
  uniq: { flags: /^-[cdui]+$/, values: ['-f', '-s', '-w'] },
  wc: { flags: /^-[clmwL]+$/, values: [] },
  cut: { flags: /^-s$/, values: ['-b', '-c', '-d', '-f'] },
}

/**
 * Files read by a supported print/filter command. Options that could read another file or
 * run a program are deliberately not recognized; an uncertain command keeps full redaction.
 *
 * @param program - The literal program name.
 * @param args - Literal argument values.
 * @returns File operands, or null for an unsupported form.
 */
function sourcePrintFiles(program: string, args: readonly string[]): string[] | null {
  if (program === 'sed') {
    return args[0] === '-n' && /^\d+(?:,\d+)?p$/.test(args[1] ?? '') ? args.slice(2) : null
  }
  const options = SOURCE_PRINT_OPTIONS[program]
  if (!options) return null
  const search = program === 'grep' || program === 'rg'
  const files: string[] = []
  // With -e anywhere, grep/rg treat every positional word as a file, even before that -e.
  let pattern = search && args.includes('-e')
  let optionsEnded = false
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (!optionsEnded && arg === '--') {
      optionsEnded = true
    } else if (!optionsEnded && search && arg === '-e') {
      if (args[++i] === undefined) return null
      pattern = true
    } else if (!optionsEnded && options.values.includes(arg)) {
      if (args[++i] === undefined) return null
    } else if (!optionsEnded && arg.startsWith('-')) {
      if (!options.flags.test(arg)) return null
    } else if (search && !pattern) {
      pattern = true
    } else {
      files.push(arg)
    }
  }
  return search && !pattern ? null : files
}

/**
 * Whether a shell command only PRINTS source files (`cat a.tsx`, `sed -n '1,40p' x.ts`,
 * `head -50 b.hurl`): its output is file content and gets the code-safe redaction, like
 * read_file. Through the env-dump grade a printed `type AuthState = 'authenticated' | …`
 * came back as `'[REDACTED]'`, and the executor wrote the mask into a new file (X1
 * flash-m58). Literal echo/printf headings between reads do not change that grade (m309).
 * Expansions, other commands, env files and labels without a source read keep the full grade.
 *
 * @param command - The shell command.
 * @returns True when the command prints source files, with only literal headings and filters.
 */
export function printsOnlySource(command: string): boolean {
  if (/\.env\b/.test(command)) return false
  let readsSource = false
  let previousEnd = 0
  for (const located of locatedCommandSegments(command)) {
    const { segment, start, end, programOffset, separator, terminator } = located
    // The parser unwraps env/sh/timeout and groups for other consumers. Redaction must not
    // grant their output source status just because the inner program happens to read code.
    // It also omits a wrapper with no inner command (notably `env`, which dumps secrets).
    // Require every intervening byte to be a separator, never an omitted command.
    if (
      !segment ||
      start === null ||
      end === null ||
      programOffset === null ||
      located.assignments.length > 0 ||
      !/^[\s;&|]*$/.test(command.slice(previousEnd, start)) ||
      command.slice(start, programOffset).trim() !== '' ||
      command.slice(programOffset, programOffset + segment.program.length) !== segment.program ||
      !['', ';', '&&', '\n', '|'].includes(separator) ||
      terminator === '&'
    ) {
      return false
    }
    previousEnd = end
    const { program } = segment
    const label = program === 'echo' || program === 'printf'
    const args: string[] = []
    for (const word of segment.args) {
      // The existing source-read idiom discards diagnostics; labels may not redirect at all.
      if (!label && word === '2>/dev/null') continue
      const literal = sourceReadLiteral(word)
      if (literal === null) return false
      args.push(literal)
    }
    const piped = separator === '|' || terminator === '|'
    if (program === 'cd') {
      if (piped || args.length !== 1 || args[0]!.startsWith('-')) return false
    } else if (label) {
      if (piped || args.length === 0) return false
      // printf's %n and -v assign variables; only literal formats and %s headings belong here.
      if (
        program === 'printf' &&
        (args[0]!.startsWith('-') || args[0]!.replace(/%%|%s/g, '').includes('%'))
      ) {
        return false
      }
    } else {
      const filter = separator === '|'
      if (
        !(
          filter ? /^(?:head|tail|sort|uniq|wc|cut|nl|grep)$/ : /^(?:cat|head|tail|nl|sed|grep|rg)$/
        ).test(program)
      ) {
        return false
      }
      const files = sourcePrintFiles(program, args)
      if (files === null) return false
      if (filter) {
        if (files.length !== 0) return false
      } else {
        if (
          files.length === 0 ||
          !files.every((file) => !file.startsWith('-') && SOURCE_FILE_RE.test(file))
        ) {
          return false
        }
        readsSource = true
      }
    }
  }
  return readsSource && /^[\s;]*$/.test(command.slice(previousEnd))
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

/**
 * The file a command sends its own output to, when it redirects it (`> out.txt`,
 * `>> log`, `&> run.log`, `| tee [-a] file`), or null. A background command that does
 * this leaves its task log empty, so the log is the wrong place to look and an empty
 * log proves nothing (X1 flash-m29).
 *
 * Which redirect counts is decided by the command's own shell structure, from the same
 * parse every other command reader uses: a redirect written in a BACKGROUNDED statement
 * (`… &`) or inside a `( … )` / `{ … }` group writes that process's or group's output, not
 * the command's. The platform's own preview launch is exactly that — the preview server is
 * started with `>/tmp/mol-preview-4173.log 2>&1 &` inside the build/serve prelude, and the
 * suite's foreground command follows it — so a reader that took the last `>` in the whole
 * text told a run its output went to the PREVIEW's log (X1 flash-m136 +18:31).
 *
 * The target comes back without its shell quotes: `> '/tmp/x.log'` is `/tmp/x.log`, and
 * the callers resolve a relative one against the command's cwd.
 *
 * @param command - The shell command.
 * @returns The target, or null (`/dev/null` and `&1`/`&2` are not files).
 */
export function outputRedirectTarget(command: string): string | null {
  let last: string | null = null
  for (const statement of locatedCommandSegments(command)) {
    // A backgrounded statement's own redirect is that process's log, never the command's.
    if (statement.terminator === '&') continue
    if (statement.redirectTarget !== null) last = statement.redirectTarget
  }
  return last
}

/** A trailing `| tail -N` / `| tail -n N` (stderr redirects before it stay). */
const TRAILING_TAIL = /\s*\|\s*tail(?:\s+-n)?\s+[-+]?\d+\s*$/

/** `--reporter line` / `--reporter=line` / `--reporter="list,line"`, with its value. */
const REPORTER_FLAG = /--reporter(=|\s+)(?:"([^"]*)"|'([^']*)'|(\S+))/g

/** The reporters a command's last `--reporter` names, and where the flag sits in that step. */
interface ReporterFlag {
  /** Index of the flag's first character. */
  start: number
  /** Index one past its last character. */
  end: number
  /** The separator it uses (`=` or the whitespace after the flag). */
  separator: string
  /** The reporters it names, in their own order. */
  values: string[]
}

/**
 * The reporters a step's LAST `--reporter` names (`--reporter=list,line` → `['list', 'line']`).
 *
 * Playwright takes the last `--reporter`, so an earlier one is not what runs.
 *
 * @param step - The command's last step.
 * @returns The flag's span and its reporters, or null when the step names none.
 */
function lastReporterFlag(step: string): ReporterFlag | null {
  REPORTER_FLAG.lastIndex = 0
  let last: RegExpExecArray | null = null
  for (let m = REPORTER_FLAG.exec(step); m !== null; m = REPORTER_FLAG.exec(step)) last = m
  if (!last) return null
  const value = last[2] ?? last[3] ?? last[4] ?? ''
  return {
    start: last.index,
    end: last.index + last[0].length,
    separator: last[1] ?? '=',
    values: value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  }
}

/**
 * The reporters that print one line (or one mark) per test into the log, `list` among them.
 *
 * `list` is the only one of these the platform can read back — `suite-fail-fast.ts`'s fail-fast
 * note and the Tests bar both parse its `  ✓/✘  <n> … (…)` lines — so it is the one a background
 * run is put on. The rest are here because they print each failure TOO: a log with two of them
 * carries every result twice.
 */
const PRINTING_REPORTERS = new Set(['list', 'line', 'dot', 'basic', 'spec'])

/**
 * Playwright's switch for printing each failure's own error as that test fails, instead of only in
 * the summary at the end: `list` reads it in its constructor (`ListReporterOptions.printFailuresInline`,
 * `playwright/lib/reporters/list.js` — 1.63, the version the toolchain pins), and when it prints
 * inline the end-of-run repeat is suppressed with it (`epilogue(!printFailuresInline)`), so one
 * reporter still prints each failure exactly once.
 *
 * Every background command is given this (see {@link streamingBackgroundCommand}), so a suite the
 * executor starts through its own wrapper is covered too — the wrapper passes the environment on
 * to the Playwright process it spawns. Without it the log's only failure lines are `✘` rows:
 * X1 xr-molecule-flash-m99 (+19:27 → +21:00, 2026-10-16) was told to `grep -n -A 20 '<test name>'`
 * the log, got nothing back through four greps, inferred causes from the spec prose instead, and
 * edited `app/src` while the run was still walking — which voids the run.
 */
export const PLAYWRIGHT_FAILURES_INLINE_ENV = 'PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE'

/**
 * Whether a command step only reports or discards the status of the steps before it: `echo EXIT
 * $?`, `echo $?`, `printf …`, `true`, `exit 0`.
 *
 * The shape models and the platform's own re-run notes send routinely ends on one of these —
 * `npx playwright test … > /tmp/pw.log 2>&1; echo EXIT $?` — and reading the split's last part as
 * the run withheld the reporter, the inline-failure switch and `--retries=0` from every one of
 * them: the log then carried `✘` rows and nothing else while the wait note promised each failure's
 * error under them (xr-molecule-flash-m173 +17:07, +39:14). Whitespace and a group's closing
 * punctuation are not part of the step; {@link streamingBackgroundCommand} strips those before
 * asking, and strips them here too for the split it is given.
 *
 * @param step - One statement of the command, as the `&&`/`||`/`;` split left it.
 * @returns True when the step runs nothing but a status report.
 */
function isStatusOnlyStep(step: string): boolean {
  const text = step.replace(/[\s)}]+$/, '').trim()
  return /^(?:echo|printf)\b/.test(text) || /^true$/.test(text) || /^exit(?:\s+\S+)?$/.test(text)
}

/**
 * Rewrite a command about to run in the background so its log grows while it
 * runs. Two shapes left the log empty until exit, and an empty log is what
 * `wait_for_task` reads as "stuck", so working suites were reported stuck and
 * killed (X1 run flash-m15 lost 20 of its 60 minutes this way, 2026-10-15):
 *
 * - a trailing `| tail -N`, which holds everything back until the command ends.
 *   It is dropped: `wait_for_task` already returns the end of the log.
 * - any output-only filter piped after a SUITE runner (`| grep … | tail -20`), which hides the
 *   failing test's own error and leaves the pipeline's exit status — the filter's — as the run's.
 *   Every such stage is dropped ({@link stripTrailingSuiteFilters}); `wait_for_task` already
 *   returns the end of the full log, and a run whose tally shows a failure must never report 0
 *   (xr-molecule-flash-m101 +25:54).
 * - `playwright test` with no `--reporter`, which runs the config's reporter —
 *   often `html`, which prints nothing per test. `--reporter=list` is added
 *   when the playwright run is the command's last step, piped or not: it writes each result as
 *   it finishes, and it is the shape the platform reads a background suite back in.
 *
 * The run ends up with exactly ONE reporter that prints each failure — `list`. A run that names
 * any other printing reporter has it REPLACED, never joined: two of them write every test result
 * into the log twice, which on X1 flash-m83 (2026-10-16) made a `--reporter=list,line` run (its
 * `line` added by this function one run earlier) report two distinct failures as "4 of this run's
 * tests have already failed the same way", and the executor stopped a 139-test walk at test 21
 * with a single cause in hand. `line` alone is no use either: it writes `[n/N] <title>` with no
 * ✓/✘ mark and no duration, so on X1 flash-m62 an 8.3-minute walk of one suite could never trip
 * the fail-fast note. A reporter set that writes a machine format to a file (`json`, `html`,
 * `junit`) is the
 * executor's own and is left exactly as it is — so is any reporter this build does not know.
 *
 * Every background command that is not a no-test invocation is also given
 * {@link PLAYWRIGHT_FAILURES_INLINE_ENV} (inert except for Playwright's `list` reporter), so each
 * failure's own error is in the log as that test fails rather than only at the end: a suite that is
 * still walking is exactly when the executor reads the log, and without it a running log carries
 * `✘` rows and nothing else (xr-molecule-flash-m99 spent ~90 s on greps of one, then fixed what it
 * guessed; m191's wrapper-launched run lost 6.5 minutes to the same shape).
 *
 * Only the step that runs the suite is touched, and only its reporter, and only when that step
 * runs something: `npx playwright test --list` takes two seconds and writes nothing per test, so
 * neither reporter nor `--retries=0` is added to it ({@link isPlaywrightRunCommand}). A trailing
 * status step (`; echo EXIT $?`, `&& true`) is not the run and is skipped when the run step is
 * found ({@link isStatusOnlyStep}); a run whose output is redirected to a file is still readable
 * through that file, which the launch records as the task's own output.
 *
 * A command that starts the suite MORE THAN ONCE is not launched at all: every run it carries is
 * a whole walk of the same suite against the same app, and only the last step is rewritten, so the
 * earlier walks run unmeasured for nothing. X1 xr-molecule-flash-m157 (+14:02) chained two whole
 * walks of one 138-test suite with `;` — 4.5 minutes each — and the second measured nothing the
 * first had not. The platform refuses a second CONCURRENT run against one app and database by the
 * ONE rule ({@link suiteRunInTheWay}) — for every pair, whatever uid a run mints — and this is the
 * same hazard inside one command ({@link suiteRunStatements}). `error` then carries the refusal,
 * naming each suite step and the ONE command to send instead (the last suite step, rewritten as
 * this function rewrites a run), and nothing is launched.
 *
 * @param command - The command as the executor sent it.
 * @param context - What the caller knows beyond the command: the tests the person's request
 *   excludes by name ({@link DiagnosisRunContext}). A `--grep-invert` of exactly those is the
 *   request's own scope, not a diagnosis, so it keeps the suite's retries on a deployed proof
 *   (xr-molecule-flash-m170 +33:16).
 * @returns The command to run and one sentence per change made (empty when none), or `error` when
 *   the command starts the suite more than once.
 */
export function streamingBackgroundCommand(
  command: string,
  context?: DiagnosisRunContext,
): {
  command: string
  changes: string[]
  error?: string
} {
  // A command that runs no test is not a run to keep a growing log for: nothing about it is
  // rewritten (flash-m79's `--list` was read as a whole-suite run end to end, and got a ~4 KB
  // refusal to send itself again with `--max-failures=15`).
  if (commandRunsNoTests(command)) return { command, changes: [] }
  const changes: string[] = []
  let out = command
  // A filter after the suite runner is not output the platform can read: it hides the failing
  // test's own error, and its exit status replaces the run's with the filter's — m101's
  // `… | grep -E "✘|passed|failed|skipped" | tail -20` reported `exitCode: 0` for a run with a
  // failure in it. Every stage the parse proves is output-only is dropped; the end of the FULL
  // log comes back anyway.
  const filtered = stripTrailingSuiteFilters(out)
  if (filtered.dropped) {
    out = filtered.command
    // A lone trailing `| tail -N` keeps its own sentence: the reason it goes is that it holds all
    // output back until the command ends, not that a filter cannot be read back.
    const tailOnly = TRAILING_TAIL.exec(filtered.dropped)
    changes.push(
      tailOnly && tailOnly[0].trim() === filtered.dropped
        ? `Dropped the trailing \`${filtered.dropped}\`: it holds all output back until the command ends, ` +
            'and wait_for_task returns the end of the log anyway.'
        : `Dropped \`${filtered.dropped}\` from after the test runner: a filtered log cannot be ` +
            'diagnosed — the failing test’s own error is not in it — and wait_for_task returns the ' +
            'end of the full log anyway.',
    )
  }
  const tail = TRAILING_TAIL.exec(out)
  if (tail) {
    out = out.slice(0, tail.index)
    changes.push(
      `Dropped the trailing \`${tail[0].trim()}\`: it holds all output back until the command ends, ` +
        'and wait_for_task returns the end of the log anyway.',
    )
  }
  // A Playwright run behind `| head -N` loses its tally, which prints last (X1
  // flash-m32 counted ✓/✘ marks by hand); the full log comes back anyway.
  const head = /\s*\|\s*head(?:\s+-n)?\s+-?\d+\s*$/.exec(out)
  if (head && isPlaywrightRunCommand(out)) {
    out = out.slice(0, head.index)
    changes.push(
      `Dropped the trailing \`${head[0].trim()}\`: Playwright prints its pass/fail count last, and it would be cut.`,
    )
  }
  // The last step that RUNS something. A trailing group closer is punctuation, not a step: a
  // brace group writes it after a `;` (`{ …; }`), so reading the split's last part literally
  // made `}` the step and withheld every rewrite from a run inside a group. A trailing status
  // step is not the run either: `… > /tmp/pw.log 2>&1; echo EXIT $?` ends on the echo, and
  // treating THAT as the run withheld the reporter, the inline-failure switch and `--retries=0`
  // from the exact shape models and the platform's re-run notes send (xr-molecule-flash-m173
  // +17:07, +39:14).
  const parts = out.split(/&&|\|\||;/)
  let stepIndex = parts.length - 1
  while (
    stepIndex > 0 &&
    (/^[\s)}]*$/.test(parts[stepIndex] ?? '') || isStatusOnlyStep(parts[stepIndex] ?? ''))
  )
    stepIndex -= 1
  const rawLastStep = parts[stepIndex] ?? ''
  // The step's own text, with the punctuation that closes the group it sits in taken off — the
  // options are parsed and placed against this text, while the closer is kept in the command.
  const lastStep = rawLastStep.replace(/[\s)}]+$/, '')
  const stepStart = rawLastStep === '' ? out.length : Math.max(0, out.lastIndexOf(rawLastStep))
  // A command that starts the suite more than once is not launched: each statement is a whole walk
  // of the same suite against the same app, only the last of them is rewritten, and the earlier
  // ones measure nothing the first did. X1 xr-molecule-flash-m157 (+14:02) chained two whole walks
  // of one 138-test suite with `;` (4.5 minutes each); the platform refuses a second CONCURRENT
  // run against one app and database by the ONE rule ({@link suiteRunInTheWay}) — for every pair,
  // whatever uid a run mints — and this is the same hazard inside one command. The reading is
  // {@link repeatedSuiteRunError}'s, so a foreground `exec_command` refuses the same commands.
  const repeated = repeatedSuiteRunError(out)
  if (repeated) return { command: out, changes: [], error: repeated }
  // The last step runs Playwright — whether or not anything is piped from it. Keying this on
  // "nothing is piped out of the last step" withheld the reporter, the inline-failure switch and
  // `--retries=0` from exactly the runs whose output was filtered (xr-molecule-flash-m101
  // +25:54); what the runner writes into its log does not depend on what reads the pipe. A
  // REDIRECT used to withhold them too (`> out.txt`), but a redirect to a FILE is readable: the
  // launch records that file as the task's own output (`outputFileByTask`, resolved from this
  // same reader) and every wait reads it back. `> /tmp/pw-full.log 2>&1; echo EXIT $?` is the
  // shape models and the platform's re-run notes send, so a run whose own redirect target is the
  // one the launch will read is a readable run (xr-molecule-flash-m173 +17:07, +39:14). A target
  // that is not a file (`/dev/null`, `2>&1`) still leaves the output unreadable.
  const runRedirect = outputRedirectTarget(lastStep)
  const finalPlaywrightRun =
    isPlaywrightRunCommand(lastStep) &&
    (runRedirect === null
      ? !/>/.test(lastStep.replace(/\d?>&\d/g, ''))
      : runRedirect === outputRedirectTarget(out))
  /**
   * Add a word to the suite runner's own arguments; false when the runner could not be placed.
   *
   * The word goes where the runner's own arguments end ({@link statementArgumentEnd}), never at
   * the end of the command's text: a pipe this rewrite could not drop still follows the runner
   * (`| tee run.log`), and a statement can end on a group closer (`( … )`, `{ …; }`) or a
   * redirection (`… 2>&1`). Appending after the `)` of a subshell was a shell syntax error that
   * killed the run at once (`sh: Syntax error: word unexpected`) and pushed the model off the
   * platform's runner shape (xr-molecule-flash-m129 +34:29); appending after a pipe hands the
   * word to the filter (m102's dangling `--trace` flag, in the same shape).
   *
   * The suite's own segment is found wherever it sits ({@link lastSuiteRun}), because a trailing
   * status step is not another command's output: in `… > /tmp/pw.log 2>&1; echo EXIT $?` the run
   * is what the launcher measures, and the echo only repeats its status
   * ({@link isStatusOnlyStep}). A suite the parse could not place — one inside a nested
   * `sh -c '<command>'` string, whose offsets are positions in THAT string — is left exactly as
   * written and the caller reports no rewrite. There is nowhere in this command the word
   * belongs, and guessing at the text is what produced both failures above.
   */
  const addToRun = (flag: string): boolean => {
    const run = lastSuiteRun(out)
    const runner = run ? run.located[run.at] : undefined
    if (!runner) return false
    const at = statementArgumentEnd(out, runner.start, runner.end)
    if (at === null) return false
    out = `${out.slice(0, at)} ${flag}${out.slice(at)}`
    return true
  }
  // A diagnosis or a re-run (capped, last-failed, grepped, or named files) walks each failure
  // once: the suite's own `retries` doubled every failure of X1 flash-m71's first whole run,
  // which had dropped the `--retries=0` it used one command earlier. A whole run whose TARGET is
  // local — its env names `localhost`/`127.0.0.1`/`0.0.0.0`, or names no URL at all, as the
  // wrapper config's default does — is not the proof run either and walks them once too:
  // xr-molecule-flash-m155 (+11:34) spent 10 minutes on its first local whole run, and the
  // suite's `retries: 1` walked each of its 68 failures a second time (0 flaky) for nothing.
  // The suite's retries are kept only for a run that names a non-local URL — the deployed proof
  // (xr-molecule-flash-m89), where they absorb a network blip. Which runs are diagnoses is
  // {@link isDiagnosisRun}'s answer and nobody else's: the platform's notes ask the same
  // function, so a run cannot be a diagnosis to one of them and the whole suite to the other.
  // Which targets are local is {@link suiteCommandTarget}'s answer.
  const diagnosis = isDiagnosisRun(lastStep, context)
  const localTarget = suiteCommandTarget(lastStep) === 'local'
  // The last step's reporters: one printer, and it is `list`. Every branch below only ever moves
  // the command TO that shape — a reporter set is never left with two printers in it.
  const reporters = finalPlaywrightRun ? lastReporterFlag(lastStep) : null
  if (reporters) {
    const printing = reporters.values.filter((v) => PRINTING_REPORTERS.has(v))
    // Already exactly `list`: the shape, and nothing printing beside it. Left verbatim — the
    // executor's own spelling of the command is not rewritten for nothing.
    if (printing.length > 0 && !(printing.length === 1 && printing[0] === 'list')) {
      // The printing reporters become ONE `list`, in the place of the first of them; every other
      // reporter (a `json`/`html`/`junit` file the executor asked for, or one this build does not
      // know) is left where it was.
      let placed = false
      const kept = reporters.values
        .map((v) => {
          if (!PRINTING_REPORTERS.has(v)) return v
          if (placed) return null
          placed = true
          return 'list'
        })
        .filter((v): v is string => v !== null)
      // Only the last step is rewritten, and its offsets are the parse's own. The punctuation
      // after the step (`; }`, or the `)` attached to it) is kept verbatim.
      out =
        out.slice(0, stepStart) +
        lastStep.slice(0, reporters.start) +
        `--reporter${reporters.separator}${kept.join(',')}` +
        lastStep.slice(reporters.end) +
        rawLastStep.slice(lastStep.length) +
        out.slice(stepStart + rawLastStep.length)
      changes.push(
        // `list` was already there and a second printer sat beside it: that one is dropped. When
        // no `list` was named at all, the printer is SWITCHED to it (flash-m62's `line`).
        printing.includes('list')
          ? `Dropped \`${printing
              .filter((v) => v !== 'list')
              .join(',')}\` from your \`--reporter=${reporters.values.join(',')}\`: ` +
              'two reporters that both print each failure write every test result into the log ' +
              'twice — the whole log doubled for nothing (X1 flash-m83) — so this run keeps ' +
              '`list` alone.'
          : `Switched the test reporters to \`--reporter${reporters.separator}${kept.join(',')}\`: ` +
              '`list` writes each test result as it finishes and is the shape the platform reads ' +
              'back from a background run, and it is the only printing reporter — two of them ' +
              'write every result into the log twice (X1 flash-m83).',
      )
    }
  } else if (finalPlaywrightRun && addToRun('--reporter=list')) {
    changes.push(
      'Added `--reporter=list` so each test result is written to the log as it finishes ' +
        '(the config reporter may print nothing until the end).',
    )
  }
  // The run's failures, in the log as they fail (see PLAYWRIGHT_FAILURES_INLINE_ENV), on EVERY
  // background command that is not a no-test invocation — not only the ones whose text this
  // reader can place the runner in. The executor starts the suite through its own wrapper often
  // (`node scripts/run-realworld-e2e.mjs`, `npm run e2e`), and the wrapper passes its environment
  // on to the Playwright process it spawns; keying the switch on a recognized `playwright test`
  // step withheld it from exactly those runs, whose logs then carried `✘` rows and nothing else
  // while the executor waited (xr-molecule-flash-m191 +12:20 → +19:40: 65 failures and ONE cause,
  // named at the last failure instead of at the third — 6.5 minutes lost). It is inert for
  // anything but Playwright's `list` reporter, which is the only reader of it.
  //
  // Set as an `export` at the head of the whole command, never mid-command: the last step may be
  // a wrapper (`timeout 280 npx playwright test`) or start a line of its own (a multi-line
  // command's last line), and an assignment written in front of either would be read as the
  // program to run.
  out = `export ${PLAYWRIGHT_FAILURES_INLINE_ENV}=1; ${out}`
  // The sentence is only true of a run this reader put on `list` — a command it cannot place (a
  // wrapper, `npm run build`) gets the switch silently, and that is all it needs.
  const endsOnListReporter =
    finalPlaywrightRun &&
    (reporters === null || reporters.values.some((v) => PRINTING_REPORTERS.has(v)))
  if (endsOnListReporter) {
    changes.push(
      'Each failure’s own error is now written into the log as that test fails, not only in the ' +
        'summary at the end — so a run that is still walking already says what its failures are, ' +
        'and you need not wait for it to end to start on them.',
    )
  }
  if (finalPlaywrightRun && (diagnosis || localTarget) && !/--retries\b/.test(lastStep)) {
    // The reason named is the one that fired: a narrowed diagnosis against a DEPLOYED URL is not a
    // local run, and calling it one (xr-molecule-flash-m170's note did) reads as the platform having
    // misread the target.
    const why = diagnosis
      ? 'a diagnosis or re-run walks each failure once; the suite’s retries apply on the deployed proof run'
      : 'a local run walks each failure once; the suite’s retries apply on the deployed proof run'
    if (addToRun('--retries=0')) changes.push(`Added \`--retries=0\`: ${why}.`)
  }
  return { command: out, changes }
}

/**
 * How a shell command starts each runner whose whole-suite run saturates the
 * sandbox it shares. The three are the runners this platform runs whole suites
 * of from a sandbox; `suiteRunKind` (molecule-dev `api/src/ai/suite-proof.ts`)
 * is the platform's fuller list of URL-testing runners, and the shapes here are
 * its shapes.
 *
 * Each is matched at the START of a pipeline segment's command-position text
 * (`commandSegments`), so a runner named as an argument is not an invocation:
 * `grep -n playwright e2e/README.md` reads a file and starts nothing.
 */
const SUITE_RUN_COMMANDS: ReadonlyArray<RegExp> = [
  // `playwright test`, not a bare `playwright` (`--version` is not a run).
  /^playwright\s+test\b/,
  // Vitest, however it is invoked (`vitest`, `npx vitest run`).
  /^vitest\b/,
  // `hurl --test …` or `hurl … x.hurl`.
  /^hurl\s+[^|\n]*(?:--test|\.hurl)/,
  // The suite's own runner SCRIPT, whoever wrote it: the supplied trees ship
  // `run-api-tests-hurl.sh` and `run-hurl-tests.sh`, and the command-position parser puts the
  // script's own NAME where the program goes (`bash fixtures/…/run-api-tests-hurl.sh` →
  // `run-api-tests-hurl.sh`). xr-molecule-flash-m170 (+06:02) chained two invocations of one such
  // script in the FOREGROUND, which no launch site counted: the first walk's tally was the only
  // evidence the note had, and it reported a passing run as 13 failures. A script named for the
  // suite is a whole walk of it; `head -30 run-api-tests-hurl.sh` is not in command position and
  // stays a read ({@link commandSegments}).
  /^run-(?:api-)?(?:hurl-)?tests?[\w-]*\.sh\b/,
]

/**
 * Every statement of a command that starts a whole test suite, in command order.
 *
 * This is the ONE count of suite runs in a command: {@link isSuiteRunCommand} asks it,
 * {@link repeatedSuiteRunError} refuses only simple identical invocations, and a re-run
 * composed from a command ({@link ./suite-overlap.js} `scopedRerunCommand`) keeps only the first.
 *
 * A statement that invokes a runner only to print is not one of these
 * ({@link commandRunsNoTests}): `npx playwright test --list` prints the tests it would run and
 * exits, and `npx playwright install`, `vitest list` and `hurl --help` start no test either.
 *
 * @param command - The shell command.
 * @returns One entry per suite-running statement, as the parser read it (empty when none).
 */
export function suiteRunStatements(command: string): string[] {
  if (commandRunsNoTests(command)) return []
  return commandSegments(command)
    .filter(
      (segment) =>
        SUITE_RUN_COMMANDS.some((re) => re.test(segment.text)) && !commandRunsNoTests(segment.text),
    )
    .map((segment) => segment.text)
}

/**
 * Whether a command runs a whole test suite — a Playwright, Vitest or Hurl run
 * — rather than a build, an install or a one-off script.
 *
 * @param command - The shell command.
 * @returns True when the command starts one of those runners.
 */
export function isSuiteRunCommand(command: string): boolean {
  return suiteRunStatements(command).length > 0
}

/**
 * Refuse only a command made entirely of identical suite invocations.
 *
 * Mixed shell commands execute as written. Rebuilding their prefix or suffix can lose writes,
 * break heredoc delimiters or turn an && guard into unconditional work (m277). Different args
 * or environments may select different suites or targets; they are not known duplicates either.
 * This is an optimization, so uncertainty always allows the original command.
 *
 * @param command - The shell command as the executor sent it.
 * @returns The duplicate-only refusal, or null when the original command should run.
 */
export function repeatedSuiteRunError(command: string): string | null {
  if (commandRunsNoTests(command)) return null
  const steps = locatedCommandSegments(command)
  if (steps.length <= 1) return null
  const first = steps[0]!
  const segment = first.segment
  if (segment === null) return null
  if (
    steps.some(
      (step) =>
        step.segment === null ||
        step.start === null ||
        step.end === null ||
        step.redirectTarget !== null ||
        step.separator === '|' ||
        step.terminator === '|' ||
        step.segment.args.some((arg) => /[<>]/.test(arg)) ||
        !SUITE_RUN_COMMANDS.some((re) => re.test(step.segment!.text)) ||
        step.segment.text !== segment.text ||
        step.assignments.join('\0') !== first.assignments.join('\0'),
    )
  )
    return null
  const last = steps.at(-1)!
  const single = streamingBackgroundCommand(command.slice(last.start!, last.end!)).command
  return (
    `This command runs the suite ${steps.length === 2 ? 'twice' : `${steps.length} times`} ` +
    `(${steps.map((step, i) => `step ${i + 1}: \`${step.segment!.text}\``).join(', ')}). ` +
    `One walk is the measurement; run exactly one: \`${single}\``
  )
}

/** A flag with its value, as {@link suiteRunBudgetCommand} writes it: `--timeout=15000`. */
const BUDGET_FLAG = /^(--[A-Za-z][\w-]*)=(\S+)$/

/**
 * The statement the suite runner occupies, and where its own arguments end.
 *
 * The LAST suite statement, wherever it sits: unlike a reporter or `--retries=0` (which only make
 * sense on the run a launcher measures), the suite's budget belongs on the run itself even when
 * another command follows it (`… ; npm run build`).
 */
function suiteRunnerArguments(command: string): { start: number; end: number; at: number } | null {
  const pipeline = lastSuiteRun(command)
  const runner = pipeline ? pipeline.located[pipeline.at] : undefined
  if (!runner || runner.start === null || runner.end === null) return null
  const start = runner.start
  const end = runner.end
  const at = statementArgumentEnd(command, start, end)
  if (at === null) return null
  return { start, end, at }
}

/**
 * A command with the supplied suite's own settings written back onto its runner as Playwright
 * flags, and the flags that could not be placed.
 *
 * The grader walks the suite under its OWN budget, so a run whose runner config sets a different
 * timeout or worker count measures a run the grader never sees (xr-molecule-flash-m169: a 60 s
 * wrapper config produced a green local proof the official 15 s grader then failed). Playwright
 * lets a command-line flag win over every config file, so the suite's values are put on the
 * runner's own arguments — written where {@link statementArgumentEnd} places them, never after a
 * pipe, redirect or group closer. Only the command's LAST suite step is touched: that is the run
 * every launch site measures.
 *
 * A flag the command already carries is REWRITTEN in place (last occurrence wins, as it does for
 * Playwright); a flag it does not carry is inserted at the end of the runner's arguments. A
 * command whose runner cannot be placed is returned exactly as written, with every flag reported
 * as unplaced, so the caller states the fact instead of claiming a pin it did not make.
 *
 * @param command - The shell command about to run.
 * @param flags - The flags to put on it, each as `--name=value`.
 * @returns The command to run, the flags placed on it, and the ones it could not carry.
 */
export function suiteRunBudgetCommand(
  command: string,
  flags: readonly string[],
): { command: string; placed: string[]; unplaced: string[] } {
  const placed: string[] = []
  const unplaced: string[] = []
  let out = command
  for (const flag of flags) {
    const parts = BUDGET_FLAG.exec(flag)
    if (parts === null) {
      unplaced.push(flag)
      continue
    }
    const name = parts[1] ?? ''
    const value = parts[2] ?? ''
    const run = suiteRunnerArguments(out)
    if (run === null) {
      unplaced.push(flag)
      continue
    }
    // `--name=value` and `--name value` alike; the last occurrence is the one Playwright uses.
    // The value is digits (milliseconds, worker counts), so a percentage or an expression is
    // left alone rather than half-rewritten.
    const written = new RegExp(
      `(?:^|[\\s;&|(])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:=|\\s+)(['"]?)(\\d[\\d_]*)(?![\\w%.])`,
      'g',
    )
    const text = out.slice(run.start, run.at)
    let last: RegExpExecArray | null = null
    for (let m = written.exec(text); m !== null; m = written.exec(text)) last = m
    if (last !== null) {
      const digits = last[2] ?? ''
      const at = run.start + last.index + last[0].length - digits.length
      out = `${out.slice(0, at)}${value}${out.slice(at + digits.length)}`
      placed.push(`${name}=${value}`)
      continue
    }
    out = `${out.slice(0, run.at)} ${flag}${out.slice(run.at)}`
    placed.push(flag)
  }
  return { command: out, placed, unplaced }
}

/** The config flag and the separator before its value, as a run may write it. */
const CONFIG_ARGUMENT = /(?:^|[\s;&|(])(?:--config|-c)(?:=|\s+)/g

/**
 * A command with the derived config put on the LAST suite runner's own arguments, replacing the
 * config the run names or added when it names none.
 *
 * Some of the suite's settings have no Playwright flag (`expect.timeout`, `use.actionTimeout`,
 * `use.navigationTimeout`), so a config the executor wrote cannot be corrected from the command
 * line. The consumer writes a derived config OUTSIDE the supplied suite that re-imports the one
 * the run selected and pins those settings ({@link SuiteBudgetPin.config}); pointing the runner at
 * it is the one way to carry them, and it belongs on the runner itself for the same reasons
 * {@link suiteRunBudgetCommand}'s flags do (last suite step, before a pipe or group closer).
 *
 * A command whose runner cannot be placed is returned exactly as written with `placed: false`, so
 * the caller never claims a config it did not point the run at.
 *
 * @param command - The shell command about to run.
 * @param config - The config to run, as the runner takes it (`--config <path>`).
 * @returns The command to run and whether the config was placed.
 */
export function suiteRunConfigCommand(
  command: string,
  config: string,
): { command: string; placed: boolean } {
  const run = suiteRunnerArguments(command)
  if (run === null) return { command, placed: false }
  const text = command.slice(run.start, run.at)
  CONFIG_ARGUMENT.lastIndex = 0
  let last: { start: number; end: number } | null = null
  for (let m = CONFIG_ARGUMENT.exec(text); m !== null; m = CONFIG_ARGUMENT.exec(text)) {
    const start = m.index + m[0].length
    const quote = text[start]
    if (quote === '"' || quote === "'") {
      const close = text.indexOf(quote, start + 1)
      if (close === -1) continue
      last = { start: start + 1, end: close }
      // The value may not continue into a second quoted word: resume after the closer.
      CONFIG_ARGUMENT.lastIndex = close + 1
    } else {
      const value = /^[^\s;&|)]*/.exec(text.slice(start))?.[0] ?? ''
      if (value === '') continue
      last = { start, end: start + value.length }
    }
  }
  if (last === null) {
    return {
      command: `${command.slice(0, run.at)} --config=${config}${command.slice(run.at)}`,
      placed: true,
    }
  }
  const from = run.start + last.start
  const to = run.start + last.end
  return { command: `${command.slice(0, from)}${config}${command.slice(to)}`, placed: true }
}

/**
 * The command with the `timeout <N>` wrapper lifted off the statement that runs the suite, and the
 * bound that was lifted.
 *
 * Used where the platform moves a run to the background: the executor wrote the bound to fit this
 * tool's foreground ceiling, and in the background that ceiling no longer applies — the task is
 * bounded by `wait_for_task` and the turn's deadline — so the prefix only kills the walk
 * ({@link withoutTimeoutWrapper}; X1 xr-molecule-flash-m143 +24:45).
 *
 * @param command - The shell command.
 * @returns The rewritten command, and the largest lifted bound (null when nothing was lifted).
 */
export function withoutSuiteTimeout(command: string): {
  command: string
  seconds: number | null
} {
  return withoutTimeoutWrapper(command, (segment) => isSuiteRunCommand(segment.text))
}

/**
 * Whether a command starts a Playwright run — a `playwright test` in command position, in a form
 * that runs something.
 *
 * `npx playwright test --list` matched every `\bplaywright\s+test\b` test in the platform and was
 * then treated as a run: held (flash-m79's config check), backgrounded for a run that outlasts
 * the tool's ceiling, and rewritten with `--reporter`. A list takes two seconds, prints its lines
 * and exits, so it is none of those; {@link commandRunsNoTests} is what decides.
 *
 * A `playwright test` named as an argument is not a run either (`head -30 run-tests.sh`,
 * `grep -n "playwright test" e2e/README.md`): the command that runs is the reader.
 *
 * @param command - The shell command.
 * @returns True when the command starts a Playwright run.
 */
export function isPlaywrightRunCommand(command: string): boolean {
  if (commandRunsNoTests(command)) return false
  return commandSegments(command).some((segment) => /^playwright\s+test\b/.test(segment.text))
}

/**
 * The programs a pipeline may end with when all they do is read what the runner printed and print
 * it again — the filters a background suite may lose without changing what it ran.
 *
 * Everything else stays: `tee` writes a file, `xargs` runs a command, and an unknown program may
 * do either. Dropping a filter is only sound where the parse can PROVE it is output-only.
 */
const OUTPUT_ONLY_FILTERS: ReadonlySet<string> = new Set([
  'awk',
  'cat',
  'column',
  'cut',
  'egrep',
  'fgrep',
  'fmt',
  'fold',
  'grep',
  'head',
  'jq',
  'nl',
  'rg',
  'sed',
  'sort',
  'tail',
  'tr',
  'uniq',
  'wc',
])

/** A word that sends output to a file (`> f`, `>> f`, `2> f`); `2>&1` only joins stderr, so it is not one. */
const OUTPUT_REDIRECT = /^(?:\d*|&)>>?(?!&)/

/** One segment of the shell parse, and where it sits in the command. */
interface LocatedSegment {
  segment: CommandSegment
  /** Offset of the segment's program word in the command, when the parse placed it. */
  start: number | null
  /** Offset one past its last word, when the parse placed it. */
  end: number | null
  /**
   * The separator the shell split at just before this segment (`|`, `&&`, `;`, a newline), as the
   * parse read it. Known even for a segment whose offsets are not ({@link LocatedSegment.start}).
   */
  between: string
}

/**
 * The shell parse's segments with their offsets in the command.
 *
 * {@link commandSegments} answers which program each stage runs; this answers where it is. The
 * offsets come from the parse's own token positions ({@link locatedCommandSegments}), never from
 * searching the command for the re-joined text: the words are joined back with single spaces for
 * matching, so `command.indexOf(segment.text)` comes up empty on irregular spacing, on a grouping
 * brace, or on anything a heredoc body shifts — and the caller then cut at a guess or refused to
 * cut at all (xr-molecule-flash-m105 +08:12, where a heredoc body turned a finished run into
 * "piped" for the rest of the session).
 *
 * A statement inside a nested `sh -c '<command>'` string is listed with null offsets: its
 * positions are positions in THAT string, so nothing may be spliced at them — but its separator
 * is known, which is all a pipeline question needs.
 *
 * @param command - The shell command.
 * @returns The located segments, in order.
 */
function locatedSegments(command: string): LocatedSegment[] {
  const out: LocatedSegment[] = []
  for (const located of locatedCommandSegments(command)) {
    if (located.segment === null) continue
    out.push({
      segment: located.segment,
      start: located.start,
      end: located.end,
      between: located.separator,
    })
  }
  return out
}

/**
 * Whether a pipeline stage only reads the output it is handed and prints it again.
 *
 * `sed`/`awk` are listed for the filters they usually are (`sed -n '1,20p'`, `awk '{print $1}'`),
 * but a program that can WRITE is not output-only: `-i` edits a file in place, and a program that
 * names `>`, `w <file>` or `system(` writes a file or runs a command. Those keep their pipe.
 *
 * @param segment - One pipeline stage of the shell parse.
 * @returns True when dropping the stage can only change what is printed.
 */
function isOutputOnlyFilter(segment: CommandSegment): boolean {
  if (!OUTPUT_ONLY_FILTERS.has(segment.program)) return false
  if (segment.args.some((arg) => OUTPUT_REDIRECT.test(arg))) return false
  if (
    segment.program === 'sed' &&
    segment.args.some((arg) => /^(?:--in-place\b|-[A-Za-z]*i)/.test(arg))
  )
    return false
  if (segment.program === 'awk' || segment.program === 'sed') {
    const program = segment.args.map((arg) => arg.replace(/^['"]|['"]$/g, '')).join(' ')
    if (/\bsystem\s*\(|>|\bw\s+\S/.test(program)) return false
  }
  return true
}

/**
 * The command's last step, when that step runs a suite: the suite's own segment and every stage
 * piped after it. Null when no suite runs, or when the suite is not the last step — a `;` or `&&`
 * after it starts another statement, whose output and status are then what the command describes.
 *
 * A stage belongs to the same statement as its predecessor only when the two are joined by a
 * single `|` ({@link LocatedSegment.between}); `||` is a different separator and is not one.
 *
 * @param command - The shell command.
 * @returns The located segments and the last suite stage's index among them, or null.
 */
function lastSuitePipeline(command: string): { located: LocatedSegment[]; at: number } | null {
  const run = lastSuiteRun(command)
  if (run === null) return null
  for (let i = run.at + 1; i < run.located.length; i += 1) {
    if ((run.located[i]?.between ?? '').trim() !== '|') return null
  }
  return run
}

/**
 * The command's last suite stage, and the parse's segments around it — whatever follows that
 * statement.
 *
 * {@link lastSuitePipeline} refuses a suite that is not the command's last step, because the code
 * the command exits with is then the following statement's. That is the right answer to "whose
 * exit code is this", and the wrong one to "which stages filter this run's output": a
 * `… --reporter=list 2>&1 | tail -5; echo done` still pipes its log through a tail, and the tail
 * still throws away every failure line the run printed (xr-molecule-flash-m121 +09:14, where the
 * platform's own hold handed that shape back and the first 95-second walk's log held only the
 * tally).
 *
 * @param command - The shell command.
 * @returns The located segments and the last suite stage's index among them, or null.
 */
function lastSuiteRun(command: string): { located: LocatedSegment[]; at: number } | null {
  if (commandRunsNoTests(command)) return null
  const located = locatedSegments(command)
  let at = -1
  for (let i = 0; i < located.length; i += 1) {
    const segment = located[i]?.segment
    if (segment && SUITE_RUN_COMMANDS.some((re) => re.test(segment.text))) at = i
  }
  return at < 0 ? null : { located, at }
}

/** A command with the output filters after its suite runner removed. */
export interface SuiteFilterStrip {
  /** The command to run. */
  command: string
  /** The pipeline stages dropped, as written (`| grep … | tail -20`), or '' when none were. */
  dropped: string
}

/**
 * Drop the output-only filters piped after the command's suite runner.
 *
 * A filter after the runner is not "the end of the log" the executor asked for: it hides the
 * failing test's own error (it usually matches none of `✘|passed|failed`), and the pipeline's exit
 * status becomes the FILTER's, so `… 2>&1 | grep -E "✘|passed|failed|skipped" | tail -20` came back
 * `exitCode: 0` for a run with a failure in it (xr-molecule-flash-m101 +25:54). The tool returns
 * the end of the full log anyway, so the filter only costs diagnosability.
 *
 * Only a contiguous suffix of the stages after the runner is cut, and only stages the parse proves
 * are output-only ({@link isOutputOnlyFilter}): a `| tee` or `| xargs` keeps its place, and a
 * caller that reports the run's exit code must then treat it as unknown
 * ({@link suiteRunPipedAfterRunner}).
 *
 * A statement after the run's own pipeline (`; echo done`, `&& echo ok`) does not protect the
 * filters before it: the filter is thrown away and the trailing statement is kept, so the log the
 * run writes still holds every failure (xr-molecule-flash-m121 — a `| tail -5; echo done` kept its
 * tail, and a 95-second walk's log held only the tally while the platform's own hold had handed
 * that command back).
 *
 * @param command - The shell command.
 * @returns The rewritten command and the stages dropped.
 */
export function stripTrailingSuiteFilters(command: string): SuiteFilterStrip {
  const run = lastSuiteRun(command)
  if (run === null) return { command, dropped: '' }
  const { located, at } = run
  // Where the suite's own pipeline ends: the first stage after the runner that is not joined to
  // its predecessor by a single `|`. Everything from there on is another statement, kept as it is.
  let end = at
  for (let i = at + 1; i < located.length; i += 1) {
    if ((located[i]?.between ?? '').trim() !== '|') break
    end = i
  }
  let first = end + 1
  for (let i = end; i > at; i -= 1) {
    const stage = located[i]
    if (!stage || !isOutputOnlyFilter(stage.segment)) break
    first = i
  }
  if (first === end + 1) return { command, dropped: '' }
  const previous = located[first - 1]
  const stage = located[first]
  const lastDropped = located[end]
  if (!previous || !stage || !lastDropped) return { command, dropped: '' }
  // A stage inside a nested `sh -c` string has no offsets in this command: nothing can be cut.
  if (previous.end === null || stage.start === null || lastDropped.end === null)
    return { command, dropped: '' }
  const pipe = stage.between.indexOf('|')
  if (pipe < 0) return { command, dropped: '' }
  const cut = previous.end + pipe
  // The stages dropped are a middle slice when a statement follows, so the text after them is
  // kept — `; echo done` still runs.
  return {
    command: `${command.slice(0, cut).trimEnd()}${command.slice(lastDropped.end)}`,
    dropped: command.slice(cut, lastDropped.end).trim(),
  }
}

/** Whether a finished run's exit code belongs to a stage after the suite runner. */
export interface SuiteRunPipelinePlacement {
  /**
   * True when a pipe this tool must not drop still follows the suite runner: the code in the
   * result is that stage's, not the run's.
   */
  piped: boolean
  /**
   * True when the suite (or a stage of its pipeline) sits inside a nested `sh -c '<command>'`
   * string, so the parse cannot place it in the command's own text. The caller then says so
   * plainly instead of implying a stage it can point at — and keeps the command's own code when
   * no pipe follows the runner, because on that command the pipeline's last stage IS the run.
   */
  unplaced: boolean
}

/**
 * Where the suite runner's exit code comes from: the runner itself, or a stage piped after it.
 *
 * {@link suiteRunPipedAfterRunner}'s one question, with the honest third answer kept apart. The
 * code a finished run reports is its LAST pipeline stage's, so a stage after the runner makes the
 * code the stage's — but only when such a stage EXISTS. The platform used to report "piped" for
 * any run whose statements it could not place in the text, which one heredoc body was enough to
 * cause: on X1 xr-molecule-flash-m105 (+08:12) a config written in the same `exec_command` made
 * the run come back with no exit code at all, and the note under it claimed a stage after the
 * runner that was not there. The parse now places every statement (`locatedCommandSegments`), so
 * "unplaced" is the rare, named case rather than a guess dressed as an answer.
 *
 * @param command - The shell command, after the streaming rewrite when one was applied.
 * @returns Whether a stage follows the runner, and whether the run could be placed at all.
 */
export function suiteRunPipelinePlacement(command: string): SuiteRunPipelinePlacement {
  const located = locatedSegments(command)
  const pipeline = lastSuitePipeline(command)
  if (pipeline !== null) {
    const stages = pipeline.located.slice(pipeline.at)
    // Every stage of the pipeline has to sit somewhere in THIS command to be read as a pipeline
    // of it: a suite inside a `sh -c '<command>'` string has no offsets here.
    const unplaced = stages.some((stage) => stage.start === null)
    return { piped: pipeline.located.length > pipeline.at + 1, unplaced }
  }
  if (commandRunsNoTests(command)) return { piped: false, unplaced: false }
  const runner = located.find((stage) =>
    SUITE_RUN_COMMANDS.some((re) => re.test(stage.segment.text)),
  )
  // No suite at all, or a suite that is not the command's last step (a `; echo done` follows it):
  // either way no stage after the RUNNER produces this command's code.
  if (!runner) return { piped: false, unplaced: false }
  return { piped: false, unplaced: runner.start === null }
}

/**
 * Whether the command's last step runs a suite whose output still passes through a stage after
 * the runner — one {@link stripTrailingSuiteFilters} could not prove is output-only (`| tee log`,
 * `| xargs …`). The pipeline's exit status is that stage's, not the run's.
 *
 * @param command - The shell command, after the streaming rewrite when one was applied.
 * @returns True when a pipe this tool must not drop still follows the suite runner.
 */
export function suiteRunPipedAfterRunner(command: string): boolean {
  return suiteRunPipelinePlacement(command).piped
}

/**
 * Start a background suite run at lower CPU and IO priority, so the sandbox it
 * shares with everything else stays responsive to what the executor does next.
 *
 * A whole-suite Playwright run saturates the one container the app's Vite
 * server, its API process and every other command also live in: on X1 flash-m75
 * the model backgrounded a 139-test run at +36:23 and the two-word shell
 * command it sent next — tick its plan file — returned nothing for 2 min 40 s,
 * measured on the chat payload and on the live-stream follower independently.
 * The backgrounding note is right that the executor should go do other work;
 * what it cannot promise is that the sandbox will let it.
 *
 * `nice -n 10` lowers the run's CPU share and `ionice -c3` its IO class. Both
 * are PROBED in the sandbox by RUNNING them, not with `command -v`: a syscall a
 * container's seccomp policy refuses leaves `-v` passing while the real run
 * fails. Each is applied only if its probe passed, so a sandbox with neither,
 * or with only one, runs the suite exactly as it did before. Playwright's own
 * workers are children of this shell and inherit both (niceness and IO class
 * are inherited across fork/exec).
 *
 * Only a command the caller has already detached reaches this: foreground
 * commands are never touched.
 *
 * @param command - The command as the executor sent it; the suite detection reads this.
 * @param launch - The shell line that would start it, with no prefix of its own.
 * @returns The line to run, and one sentence for the tool note ('' when unchanged).
 */
export function suiteRunPriorityLaunch(
  command: string,
  launch: string,
): { launch: string; note: string } {
  if (!isSuiteRunCommand(command)) return { launch, note: '' }
  return {
    // `$p` is deliberately unquoted: it expands to the prefix words, and to
    // nothing at all when neither probe passed.
    launch:
      "p=''; nice -n 10 true >/dev/null 2>&1 && p='nice -n 10'; " +
      'ionice -c3 true >/dev/null 2>&1 && p="$p ionice -c3"; ' +
      `$p ${launch}`,
    note:
      'Started at lower CPU and IO priority, so commands you run while it works stay ' +
      'responsive (the suite itself may take a little longer).',
  }
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
// `(?<!\\)`: a backslash-escaped `\|` is a literal in the shell (grep "a\|env"), not a pipe (X1 flash-m58).
const BLOCKED_COMMANDS =
  /(?<!\\)(?:^|[;&|`]\s*|(?:sh|bash|zsh|dash)\s+-c\s+['"]?\s*)(?:\/usr\/bin\/)?(?:\benv(?:\s+(?:-0|--null|--))?\s*(?:$|[;&|>)`'"])|\bprintenv\b|\bexport\s*$|\bset\s*$|\bdeclare\s+-x|cat\s+\/etc\/environment|cat\s+\/root\/\.bashrc|cat\s+\/proc\/\d+\/environ|cat\s+\/proc\/self\/environ|strings\s+\/proc|xargs[^;&|\n]*\/proc\/[^;&|\n]*environ|less\s+\/proc|head\s+\/proc|tail\s+\/proc|xxd\s+\/proc|od\s+\/proc|base64\s+\/proc|dd\s[^\n]*\/proc|sed\s[^\n]*\/proc\/[^\n]*environ|awk\s[^\n]*\/proc\/[^\n]*environ|cp\s[^\n]*\/proc\/[^\n]*environ|(?:cat|less|head|tail|xxd|od|base64|strings|dd|cp|sed|awk)\s[^\n;&|]*\/etc\/mol(?:\/|\b))/i
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
  // A blocked command runs NONE of its parts: X1 run m53 lost the `mkdir -p …`
  // chained before a blocked env read and only found out from the retry.
  const envDumpSteer =
    ' Nothing in this command ran — none of its other parts either, so run those again ' +
    'without the dump.' +
    ' You do NOT need to dump it: the managed service values (DATABASE_URL, etc.) are already ' +
    'in the process environment — read them IN CODE via process.env / your config loader, or ' +
    "check the project's provisioned env file to see WHICH services exist. Printing them only " +
    'leaks secrets into the transcript. To check whether ONE variable is set without printing ' +
    'it: `test -n "$NAME" && echo set || echo missing`.'
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
 * Whether a tool path points outside the project root once normalized (an
 * absolute path elsewhere, or a `..` that climbs out). {@link resolvePath}
 * clamps such a path to the root; a file tool must refuse it instead of
 * answering about the root — a `list_files /tmp/x` used to return the
 * workspace listing as if it were `/tmp/x` (X1 runs sonnet-m17 and sol-m05,
 * 2026-10-14).
 *
 * @param path - The path the tool was given.
 * @param projectRoot - The project root.
 * @returns True when the path leaves the root.
 */
export function isOutsideRoot(path: string, projectRoot: string): boolean {
  if (path === '' || path === '/') return false
  const clean = path.replace(/\0/g, '')
  const resolved = clean.startsWith('/')
    ? posix.normalize(clean)
    : posix.normalize(`${projectRoot}/${clean}`)
  return resolved !== projectRoot && !resolved.startsWith(projectRoot + '/')
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
 * The most alternatives one brace group may expand to. The point is to accept
 * the ordinary multi-extension form a model writes from habit
 * (`*.{ts,tsx,yml,json,md}`), not to grow a glob engine: a group is bounded so
 * a pattern cannot turn one search into hundreds.
 */
export const MAX_BRACE_GLOB_ALTERNATIVES = 16

/**
 * The accepted brace form, named in every refusal so a refusal teaches the
 * syntax rather than only reporting that the value was wrong.
 */
export const BRACE_GLOB_HINT =
  `or one brace group of up to ${MAX_BRACE_GLOB_ALTERNATIVES} comma-separated ` +
  'alternatives such as *.{ts,tsx}.'

/**
 * Expand ONE level of brace alternatives in a glob pattern, validating every
 * expanded pattern.
 *
 * Neither search tool expands braces itself: `grep --include` and `find` take
 * the pattern as a single shell-quoted argument, so no shell ever sees it.
 * `find_files {pattern:"*.{ts,tsx}"}` and `search_files {include:"*.{ts,tsx}"}`
 * were both refused outright (xr-molecule-flash-m199 and m189), costing a round
 * trip and pushing the agent to a narrower search. The group is expanded here
 * instead — `search_files` passes one `--include` per alternative and
 * `find_files` ORs one `-name`/`-path` predicate per alternative.
 *
 * Bounded on purpose: one level of braces, alternatives split on `,`, at most
 * {@link MAX_BRACE_GLOB_ALTERNATIVES}, none empty, and each EXPANDED pattern
 * must still pass {@link isValidGlob} — so a shell metacharacter in any
 * alternative (`*.{ts,$(rm)}`) is refused exactly as a bare one is.
 *
 * @param pattern - The user-supplied glob.
 * @returns Every pattern the value expands to, or null when it is not accepted
 *   (the caller reports its tool's glob error).
 */
export function expandBraceGlob(pattern: string): string[] | null {
  const open = pattern.indexOf('{')
  if (open === -1) return isValidGlob(pattern) ? [pattern] : null
  const close = pattern.indexOf('}', open + 1)
  if (close === -1) return null
  // One level only: a second `{` before the close or a second `}` after it is a
  // nested/malformed group, not an alternative.
  const nextOpen = pattern.indexOf('{', open + 1)
  if (nextOpen !== -1 && nextOpen < close) return null
  if (pattern.indexOf('}', close + 1) !== -1) return null
  const alternatives = pattern.slice(open + 1, close).split(',')
  if (alternatives.length > MAX_BRACE_GLOB_ALTERNATIVES) return null
  if (alternatives.some((alt) => alt.length === 0)) return null
  const expanded = alternatives.map(
    (alt) => `${pattern.slice(0, open)}${alt}${pattern.slice(close + 1)}`,
  )
  return expanded.every((p) => isValidGlob(p)) ? expanded : null
}

/**
 * The `find` predicate for a `find_files` pattern.
 *
 * `find -name` compares a pattern against a file's BASENAME, so a pattern
 * containing a slash (`helpers/*`, `e2e/*.spec.ts`, `src` + `**` + `/App.tsx`)
 * can never match and the tool answers `[]` (xr-molecule-flash-m77, on two
 * calls in one run). Such a pattern is matched with `-path` instead: an fnmatch
 * glob over the whole printed path, whose `*` crosses `/` — the rule
 * `.gitignore` uses, and the reason a bare `helpers/*` means "a `helpers/`
 * directory anywhere below the root". The pattern is anchored with a leading
 * `*` then `/` ("any parent") so the search root — an absolute
 * `/workspace/<app>` in a sandbox — need not be spelled out.
 *
 * A doubled-star directory segment keeps its usual meaning of ZERO or more
 * directories; `-path` alone would demand at least one, so the pattern is also
 * emitted with each such segment removed.
 *
 * @param pattern - A pattern already accepted by {@link isValidGlob}.
 * @returns A `find` predicate: `-name '…'` for a bare name, else one or more
 *   `-path '…'` alternatives, ORed inside parens when there is more than one.
 */
export function findPatternArgs(pattern: string): string {
  if (!pattern.includes('/')) return `-name ${shellQuote(pattern)}`
  return findPathArgs(pattern)
}

/**
 * The `-path` alternatives of {@link findPatternArgs}, for a pattern whose
 * directory the caller has already rooted the search at.
 *
 * `find_files` narrows the search root itself when the pattern spells its own
 * directory out (see {@link literalDirPrefix}) — `node_modules` plus
 * `@molecule/api-resource-user/dist/*.d.ts` searched that one directory. The
 * remainder (`*.d.ts`) must then keep the `-path` form rather than collapsing to
 * `-name`: `*` crosses `/` in an fnmatch glob, so the `-path` form still finds a
 * declaration file in a `dist/utilities/` subdirectory, which `-name '*.d.ts'`
 * would drop (a silent partial answer, which is worse than the timeout it
 * replaced).
 *
 * @param pattern - The pattern's remainder, with a `/` in it or not.
 * @returns One or more `-path '…'` alternatives, ORed inside parens when there
 *   is more than one.
 */
export function findPathArgs(pattern: string): string {
  const paths = pathPatternVariants(pattern).map((p) => `-path ${shellQuote(`*/${p}`)}`)
  return paths.length === 1 ? paths[0] : `\\( ${paths.join(' -o ')} \\)`
}

/**
 * The directory a GLOB pattern spells out, when it spells one out: everything
 * before the pattern's first glob character, trimmed back to the last `/`.
 *
 * A pattern is matched against the whole path with a leading "any parent"
 * anchor ({@link findPatternArgs}), so `find` visits every entry below the
 * search root. Handed `/workspace/node_modules` and
 * `@molecule/api-resource-user/dist/*.d.ts` — a directory named outright —
 * `find` walked the sandbox's entire dependency tree and hit the tool's 10 s
 * deadline without printing a result (xr-molecule-flash-m94: the one directory
 * the model meant answered a `list_files` in 0 s). The literal prefix is that
 * directory, and rooting the search at it is what keeps the call instant.
 *
 * A BARE first segment (`helpers/*`, `bonds/*`, `e2e/*.spec.ts`) is NOT one:
 * `helpers/*` means "a `helpers/` directory anywhere below the root", which the
 * tool documents and a live run relied on (xr-molecule-flash-m77 — a path
 * pattern is not anchored to one depth). Rooting those at
 * `<root>/helpers` would answer with a SUBSET, silently: the nested
 * `api/src/helpers/` matches would disappear, and a missing file reads as
 * "no such file". So a prefix is returned only when it names a path of two or
 * more segments (`@molecule/api-resource-user/dist`), which is the shape that
 * is a directory rather than a directory name.
 *
 * @param pattern - A pattern already accepted by {@link isValidGlob}.
 * @returns The literal directory prefix, without a trailing slash, or null when
 *   the pattern has no glob character, no `/`, or only a bare name before one.
 */
export function literalDirPrefix(pattern: string): string | null {
  const stripped = pattern.replace(/^(?:\.?\/)+/, '')
  const firstGlob = stripped.search(/[?*[]/)
  // No glob at all: the pattern IS a path, and the whole-tree form already
  // finds it at any depth.
  if (firstGlob === -1) return null
  const at = stripped.slice(0, firstGlob).lastIndexOf('/')
  if (at <= 0) return null
  const prefix = stripped.slice(0, at)
  return prefix.includes('/') ? prefix : null
}

/**
 * Whether a backend error is the sandbox's own command deadline.
 *
 * The E2B SDK answers a timed-out `exec` with its generic text —
 * `[deadline_exceeded] the operation timed out: … It can be modified by passing
 * 'timeoutMs' when making the request. Use '0' to disable the timeout.` — which
 * names an option the executor cannot set and says nothing about the search
 * that died. Handing that sentence to the model is what xr-molecule-flash-m94
 * read after `find_files` spent 10 s walking `node_modules`; the tool answers
 * the deadline in its own words instead (see {@link searchTimeoutError}).
 *
 * @param error - The error the backend threw.
 * @returns True when the error reads as a timeout or a deadline.
 */
export function isCommandTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /deadline[_ ]?exceeded|timed out|timeout/i.test(message)
}

/**
 * The answer a search tool gives when the backend's deadline fires: what was
 * searched, for what, how long the tool allowed, and the two ways to get an
 * answer — a narrower `path`, or a listing. Never the vendor's `timeoutMs`
 * sentence (see {@link isCommandTimeout}).
 *
 * @param tool - The tool that timed out (`find_files`, `search_files`).
 * @param searched - The directory the search actually covered.
 * @param pattern - The pattern it was searching for.
 * @param seconds - The tool's own limit, in seconds.
 * @param hint - What to do differently — the narrower target or the listing tool.
 * @returns The message's text.
 */
export function searchTimeoutError(
  tool: string,
  searched: string,
  pattern: string,
  seconds: number,
  hint: string,
): string {
  return (
    `${tool} timed out after ${seconds}s searching ${searched} for "${pattern}" — the sandbox stopped the ` +
    `command at its deadline, so there is no result (this is not an empty directory). ${hint}`
  )
}

/**
 * The `-path` globs for a pattern that contains a slash, one per way each
 * doubled-star directory segment can stand for zero directories.
 *
 * Dropping the segment is not a convenience: `*` already crosses `/` in a
 * `-path` glob, so the KEPT form (`src` + `**` + `/App.tsx`) matches one or more
 * intervening directories at any depth, and only the DROPPED form
 * (`src/App.tsx`) matches the file sitting directly in `src/`. Both are what
 * the glob means to a caller.
 *
 * @param pattern - The glob, e.g. `src` + `**` + `/App.tsx`.
 * @returns The path globs, each without the leading "any parent" anchor (added
 *   by {@link findPatternArgs}).
 */
function pathPatternVariants(pattern: string): string[] {
  const rooted = pattern.replace(/^(?:\.?\/)+/, '')
  const out = new Set<string>()
  const pending: Array<{ text: string; from: number }> = [{ text: rooted, from: 0 }]
  while (pending.length > 0) {
    const { text, from } = pending.pop()!
    const at = text.indexOf('**/', from)
    if (at === -1) {
      out.add(text)
      continue
    }
    pending.push({ text, from: at + '**/'.length }) // keep it: one or more dirs
    // Drop it — the zero-directories case, which `-path` cannot express on its own.
    pending.push({ text: text.slice(0, at) + text.slice(at + '**/'.length), from: at })
  }
  return [...out]
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
 * The error for a file tool called with NO arguments at all — `edit_file {}`, the
 * shape a truncated provider stream leaves behind.
 *
 * The path message is the wrong reading of it: "requires a non-empty path
 * argument" says the call was understood and the path was left out, so the model
 * retries the call it just made instead of sending the whole call again (x0
 * flash-m83 +29:32: `edit_file {}`, one round lost). An empty object and a
 * missing `path` are different failures and deserve different sentences.
 *
 * @param input - The raw tool input.
 * @param tool - The tool name, for the message.
 * @returns The truncation message, or null when the call carried any argument.
 */
export function emptyCallError(input: unknown, tool: string): string | null {
  const empty =
    input === undefined ||
    input === null ||
    (typeof input === 'object' &&
      !Array.isArray(input) &&
      Object.keys(input as Record<string, unknown>).length === 0)
  return empty
    ? `${tool} arrived with no arguments at all — the call was cut short, usually a truncated response. Send the whole call again.`
    : null
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

/**
 * A file's text as the request counts it: the length of its JSON string.
 *
 * JSON escaping (`\n` → `\\n`, `"` → `\"`) costs characters, and the request
 * side counts the SERIALIZED tool result. A window of 59,000 characters of
 * source — 1,200 lines — arrives as ~60,200 characters of JSON, over the
 * ceiling it was sized for, so a window is measured with this rather than by
 * its raw text length.
 *
 * @param text - The text.
 * @returns Its serialized length, without the surrounding quotes.
 */
export function serializedChars(text: string): number {
  return JSON.stringify(text).length - 2
}

/**
 * How many leading lines of a file fit inside a budget of SERIALIZED chars,
 * the way `read_file` sizes a window (see {@link serializedChars}).
 *
 * @param content - The file's full text.
 * @param chars - The budget in serialized chars.
 * @returns The line count, at least one.
 */
export function linesWithinSerialized(content: string, chars: number): number {
  let used = 0
  let lines = 0
  for (const line of content.split('\n')) {
    // +2: the newline between two lines escapes to `\n`. The last line of a
    // window has no trailing newline, so this counts 2 chars it does not use —
    // a window that errs small is the safe direction here.
    used += serializedChars(line) + 2
    if (used > chars && lines > 0) break
    lines++
  }
  return Math.max(1, lines)
}

/**
 * Most files one batched `read_file` call returns. The cap exists so a survey
 * of a large tree cannot swallow the turn's context in one result; every path
 * past it is named in the result's `note` and listed with its own `error`, so
 * the model continues from there.
 */
export const MAX_BATCH_READ_FILES = 25

/**
 * The most one `read_file` RESULT may carry, in chars of its JSON — every file
 * the call returns, the envelope and the note included. That is how the request
 * side counts a tool result, so it is how this tool counts one too
 * ({@link serializedChars}).
 *
 * One tool result is ONE block in the request, and the request side caps a
 * block: molecule-dev cuts any block over `MAX_TAIL_BLOCK_CHARS` (60,000) in
 * place, keeping ~30 KB of each end. A batched read that crossed it lost its
 * MIDDLE — the cut lands between two `"content"` values, so whole files fell
 * out and the note in their place said only "N characters cut here" — while
 * this tool's own note had promised each of those files that it "fits in one
 * call, so it is not paged": X0 flash-m81 (2026-10-16) read ten e2e specs in
 * one call (121,467 chars), lost the middle six, and bought them again in six
 * further calls (52,908 chars).
 *
 * So the CALL gets the ceiling the request gives it. Whole files are returned
 * up to it; the paths that did not fit are named in `note` and listed in
 * `files` with their own `error`, the shape every other entry has. No file is
 * ever cut, and no read result reaches the request-side cut. A test in
 * molecule-dev's `context-fit` asserts the two ceilings still agree.
 */
export const MAX_READ_CALL_CHARS = 60_000

/**
 * Room inside one read result for what is not file content: the `path`, the
 * offset/line fields, and the note.
 *
 * A batch sizes each file against what the call has left
 * ({@link MAX_READ_CALL_CHARS} less this), so the entry that does not fit is
 * caught here rather than by the request-side cut.
 */
export const READ_RESULT_ENVELOPE_CHARS = 1_000

/**
 * The most one read_file call returns for ONE file when no window was asked
 * for, in serialized chars: larger files come back as their first window, with
 * a note saying how to read the rest.
 *
 * MAX_READ_SIZE (5 MB) is a bound on what the tool will open, not on what it
 * should hand a model: a single batched read that returned a 1.2 MB README
 * put the next three provider calls at 366k tokens (~330k of them fresh)
 * against a 120k-token context cap (X0 run x5, call 26). This is the call's
 * own ceiling ({@link MAX_READ_CALL_CHARS}) less the room its envelope takes,
 * so one read result — one file or twenty-five — fits inside what the request
 * side carries without being cut.
 */
export const MAX_READ_RETURN_CHARS = MAX_READ_CALL_CHARS - READ_RESULT_ENVELOPE_CHARS

/**
 * A file this small is returned whole on a second window of it (paging it costs a call each).
 * The same bound as {@link MAX_READ_RETURN_CHARS}: the windowed-read note promises that a
 * file under it "fits in ONE call", and a smaller bound here broke that promise (X1 flash-m67).
 */
export const SMALL_FILE_WHOLE_CHARS = MAX_READ_RETURN_CHARS

/**
 * How large an HTML document must be before a whole-file read is replaced by its
 * outLINE — much smaller than {@link MAX_READ_RETURN_CHARS}, because the cost of
 * an HTML read is almost never worth it.
 *
 * An entry document is boilerplate the reader rarely needs in full: meta tags,
 * stylesheet and preload links, a `<style>` block, and a handful of `<script>`
 * tags. The parts an executor acts on — the body's structure, where a script is
 * loaded — are all visible in an outline of one line per tag. X0 flash-m77 paid
 * 63,735 chars for one such read: ~60 KB of it was the IDE's own preview bridges,
 * and the read pushed the transcript past its context cap, so the e2e specs the
 * executor had just read were trimmed to summaries and it read the whole suite
 * again — twice (findings, +01:23 and +02:56). The scaffold now keeps those
 * bridges in separate files, but a template's own head is still ~5-12 KB, and a
 * static-site or SSR entry can be far more.
 *
 * The outline is not a truncation: the note beside it names the exact
 * offset/limit that returns the whole document in one call.
 */
export const MAX_HTML_INLINE_CHARS = 16 * 1024

/** Most lines an HTML outline prints before it stops and says so. */
export const MAX_HTML_OUTLINE_LINES = 200

/** Longest a single outline line may be before it is cut. */
const MAX_HTML_OUTLINE_LINE_CHARS = 200

/** Whether `text` is an HTML document (a doctype or an `<html` root tag). */
export function looksLikeHtml(text: string): boolean {
  return /^\s*(?:<!doctype\s+html|<html[\s>])/i.test(text)
}

/**
 * An OUTLINE of an HTML document: its head's tags and the tags that open each
 * body section, one per line, with line numbers.
 *
 * Line-based on purpose — a parser would be a dependency and an attack surface
 * for a read that only has to be *navigable*. A line is shown when it starts with
 * `<` after trimming, which is what keeps the inside of a `<style>` block, a
 * `<script>` body or a prerendered text section out of the outline while keeping
 * every tag the document is built from. Long lines (a minified tag, a data URI)
 * are cut, and the whole outline is capped, so a pathological document cannot
 * turn one read into another wall of text.
 *
 * @param text - The document's full text.
 * @param label - What to call the document in the outline's header (its path).
 * @returns The outline — or null when `text` is not an HTML document.
 */
export function htmlOutline(text: string, label = 'document'): string | null {
  if (!looksLikeHtml(text)) return null
  // "0 KB" for anything under a kilobyte reads like a bug; say the real unit.
  const size = (chars: number): string =>
    chars >= 1024 ? `${Math.round(chars / 1024)} KB` : `${chars} char${chars === 1 ? '' : 's'}`
  const lines = text.split('\n')
  const out: string[] = []
  let skipped = 0
  let skippedChars = 0
  let truncated = false
  const flushSkipped = (): void => {
    if (skipped === 0) return
    out.push(`        … ${skipped} more line${skipped === 1 ? '' : 's'} (${size(skippedChars)}) …`)
    skipped = 0
    skippedChars = 0
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()
    if (trimmed !== '' && trimmed.startsWith('<')) {
      if (out.length >= MAX_HTML_OUTLINE_LINES) {
        truncated = true
        break
      }
      flushSkipped()
      const shown =
        trimmed.length > MAX_HTML_OUTLINE_LINE_CHARS
          ? `${trimmed.slice(0, MAX_HTML_OUTLINE_LINE_CHARS)}… (${trimmed.length} chars on this line)`
          : trimmed
      out.push(`${String(i + 1).padStart(6)}  ${shown}`)
    } else {
      skipped++
      skippedChars += line.length + 1
    }
  }
  flushSkipped()
  const header =
    `OUTLINE of ${label} — ${size(text.length)}, ${lines.length} lines. ` +
    `Its tags and the tags that open each section, one line each; tag bodies (CSS, JS, text) are not shown.` +
    (truncated ? ` (Outline capped at ${MAX_HTML_OUTLINE_LINES} lines.)` : '')
  return `${header}\n\n${out.join('\n')}`
}

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
  // Room for the tally line it may append, so the result stays near the cap.
  return withRunTally(
    s,
    truncateMiddleBody(s, Math.max(Math.floor(maxLength / 2), maxLength - 200)),
  )
}

/**
 * A test run's tally lines (`  3 failed`, `  71 passed (4.6m)`) the cut text lost, put back at
 * its end: Playwright lists every failed test after its "N failed" line, so a long list pushed
 * the line itself into the cut middle and the run read as having no failures (X1 flash-m60).
 *
 * @param original - The whole output.
 * @param cut - The truncated output.
 * @returns The cut output, with any lost tally lines appended.
 */
function withRunTally(original: string, cut: string): string {
  const tally = [
    ...original.matchAll(
      /^\s*\d+ (?:failed|passed|flaky|skipped|did not run|interrupted)\b[^\n]{0,40}$/gm,
    ),
  ].map((m) => m[0].trim())
  const lost = tally.filter((line) => !cut.includes(line))
  return lost.length ? `${cut}\n[run tally] ${lost.join(' · ')}` : cut
}

/**
 * {@link truncateMiddle} without the tally guard.
 *
 * @param s - The text.
 * @param maxLength - The budget.
 * @returns The cut text.
 */
function truncateMiddleBody(s: string, maxLength: number): string {
  // Reserve room for the elision notice so head + notice + tail stays WITHIN
  // maxLength — the cap is a real token budget the caller relies on (a head-only
  // truncate that overshoots by its suffix length breaks that contract). 140 =
  // the fixed notice text (~124) + up to ~12 digits for the omitted count.
  const noticeReserve = 140
  // Cap too small to fit the notice + any head/tail → plain head slice (still
  // within maxLength; the middle-preserving form only helps at real sizes).
  if (maxLength <= noticeReserve) return s.slice(0, maxLength)
  const budget = maxLength - noticeReserve
  // A test run's numbered failure blocks are what the reader needs, and in a long run they
  // sit in the middle, between per-test progress and the tally: keep them over progress
  // (X1 flash-m45: 31 failure bodies dropped, 8 KB of passing progress kept).
  const failures = failureBlocks(s)
  if (failures.length > 0) {
    const headLen = Math.min(800, Math.floor(budget * 0.1))
    const tailLen = Math.min(1500, Math.floor(budget * 0.2))
    let room = budget - headLen - tailLen
    const kept: string[] = []
    for (const block of failures) {
      const piece = block.length > 900 ? `${block.slice(0, 897)}...` : block
      if (piece.length + 1 > room) break
      kept.push(piece)
      room -= piece.length + 1
    }
    const left = failures.length - kept.length
    return (
      s.slice(0, headLen) +
      `\n\n... [middle truncated — progress lines left out; ${kept.length} of ${failures.length} failure blocks kept${left ? `, ${left} more not shown` : ''}] ...\n\n` +
      kept.join('\n') +
      '\n\n' +
      s.slice(s.length - tailLen)
    )
  }
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
 * A Playwright failure block's header line:
 * `  3) [chromium] › e2e/a.spec.ts:5:1 › home › shows the title ────────`.
 *
 * Two things vary and both are optional here. The `[<project>] › ` half is absent from a run
 * whose config declares no projects, and the `line` reporter draws a rule after the title on
 * the same line. Both forms name a title path, so a header is only a header when the line
 * carries a `›` — a plain numbered list in a build log must not read as test failures.
 */
const FAILURE_BLOCK_HEADER = /^\s*\d+\)\s+(?:\[[^\]\n]*\]\s*›\s*)?(?=[^\n]*›)(.+?)\s*─*\s*$/

/**
 * The numbered failure blocks of a Playwright report (`  1) [chromium] › file:line › title`
 * up to the next block or the tally).
 *
 * @param s - Test-runner output.
 * @returns Each block, in order (empty when there are none).
 */
export function failureBlocks(s: string): string[] {
  const lines = s.split('\n')
  const blocks: string[] = []
  let current: string[] | null = null
  for (const line of lines) {
    if (FAILURE_BLOCK_HEADER.test(line)) {
      if (current) blocks.push(current.join('\n').trimEnd())
      current = [line]
    } else if (current) {
      if (/^\s*\d+ (?:passed|failed|flaky|skipped|did not run)\b/.test(line)) {
        blocks.push(current.join('\n').trimEnd())
        current = null
      } else current.push(line)
    }
  }
  if (current) blocks.push(current.join('\n').trimEnd())
  return blocks
}

/** Failure lines shown from a log that is still being written. */
export const RUNNING_FAILURE_LINES = 40

/** Bytes of a running log's end appended after its failure lines. */
export const RUNNING_TAIL_BYTES = 1000

/**
 * The lines worth showing from a log that is still being written: a failed test's mark or
 * numbered block header, and a runner's own error lines. Matched with `grep -E`.
 */
export const RUNNING_FAILURE_LINE_RE =
  '^[[:space:]]*(✘|✗|×|✖|✕|[0-9]+\\)|[0-9]+ (passed|failed|flaky|skipped|did not run)|FAIL|FAILED|ERROR|Error:|error:|Traceback|AssertionError)'

/**
 * The shell command whose stdout is the interesting part of a log that is still being written:
 * the failure lines so far (capped at {@link RUNNING_FAILURE_LINES}), then the end of the log.
 *
 * A Playwright `list` run prints one line per test as it finishes, so the LAST bytes of a running
 * log are its least informative part — in X1 flash-m61 the last 3 000 bytes of a 139-test walk
 * were the skip list, and all 61 failures were above them, which cost the run the grep it had to
 * make anyway. A background run also carries each failure's own error as it fails
 * ({@link PLAYWRIGHT_FAILURES_INLINE_ENV}), and {@link RUNNING_FAILURE_LINE_RE} already matches
 * those blocks' headers and their `Error:` lines, so this slice shows the causes too.
 *
 * @param log - The task log path.
 * @param own - A file the command redirects its own output to, if any.
 * @returns The shell command, safe to hand to the execution backend as-is.
 */
export function runningOutputSliceCommand(log: string, own?: string): string {
  const read = `cat ${log}${own ? ` ${shellQuote(own)}` : ''} 2>/dev/null`
  return (
    `{ ${read} | grep -aE ${shellQuote(RUNNING_FAILURE_LINE_RE)} | head -${RUNNING_FAILURE_LINES} | cut -c1-300; ` +
    `echo; ${read} | tail -c ${RUNNING_TAIL_BYTES}; }`
  )
}

/** Bytes of a running log a repeating-cause look reads back. */
export const REPEATING_CAUSE_TAIL_BYTES = 40_000

/**
 * The shell command whose stdout is enough of a running log to tell whether one cause is
 * repeating: its tail, {@link REPEATING_CAUSE_TAIL_BYTES} of it.
 *
 * {@link runningOutputSliceCommand} is the wrong read for this: it keeps only the FIRST 40
 * failure lines plus 1 000 bytes, so on a run whose failures print a body each — which is what
 * a `line` reporter does, and the only form that names the cause as an error message rather than
 * a duration — three bodies do not fit, and the repeat is invisible. This read is not shown to
 * anyone; it is parsed.
 *
 * @param log - The task log path.
 * @param own - A file the command redirects its own output to, if any.
 * @returns The shell command, safe to hand to the execution backend as-is.
 */
export function runningCauseCommand(log: string, own?: string): string {
  const read = `cat ${log}${own ? ` ${shellQuote(own)}` : ''} 2>/dev/null`
  return `${read} | tail -c ${REPEATING_CAUSE_TAIL_BYTES}`
}

/**
 * DISTINCT tests that must share one signature before a running suite's repeating cause is named.
 * A test the log prints twice, or a test that failed twice, is still one test.
 */
export const REPEATING_FAILURE_MIN = 3

/** One failed test, as a running suite's log names it. */
export interface FailedTest {
  /** The location the log writes (`specs/e2e/articles.spec.ts:32`), or '' when it writes none. */
  where: string
  /** The test's own title — the last segment of its title path. */
  title: string
  /** How long it ran before failing, in seconds, or null when the log does not say. */
  seconds: number | null
}

/** A cause repeating among a running suite's failures. */
export interface RepeatingFailure {
  /**
   * How many DISTINCT tests share the signature — a test printed twice (two reporters in the
   * log) or failed twice (a retry) is one test.
   */
  count: number
  /** The shared error line, when the log carries the failures' bodies (`line` reporter). */
  message: string | null
  /** The shared duration in seconds, when the failures line up by how long they ran. */
  seconds: number | null
  /** The distinct tests that share it, in log order. */
  tests: FailedTest[]
}

/** ANSI SGR sequences — the `line` reporter writes cursor moves even into a file. */
// eslint-disable-next-line no-control-regex -- an escape sequence IS a control character
const ANSI_SGR = /\u001B\[[0-9;]*[A-Za-z]/g

/**
 * A `list`-reporter result line: `  ✘    3 [chromium] › e2e/a.spec.ts:5:1 › A › does x (15.6s)`.
 * The `[<project>]` half is optional (a config with no projects prints none), as is the title
 * path's `›` tail. Durations are Playwright's own: `ms`, `s`, `m`.
 */
const LIST_RESULT_LINE =
  /^\s*([✓✘])\s+\d+\s+(?:\[[^\]\n]*\]\s*›\s*)?(.+?)\s+\((\d+(?:\.\d+)?)\s*(ms|s|m)\)\s*$/

/** A title path's location segment (`…/articles.spec.ts:32:3`). */
const TITLE_LOCATION = /^(.*?:\d+)(?::\d+)?$/

/**
 * Split a Playwright title path (`…/a.spec.ts:5:1 › Home › shows the title`) into the location
 * and the test's own title, dropping the column (a re-run names `file:line`).
 *
 * @param titlePath - The title path the log writes.
 * @returns The location ('' when the path names none) and the title.
 */
function splitTitlePath(titlePath: string): { where: string; title: string } {
  const parts = titlePath.split(' › ')
  const location = TITLE_LOCATION.exec(parts[0]?.trim() ?? '')?.[1]
  if (location)
    return { where: location, title: parts.length > 1 ? (parts.at(-1) ?? '').trim() : '' }
  return { where: '', title: parts.join(' › ').trim() }
}

/**
 * The seconds a Playwright duration is worth, in Playwright's units.
 *
 * @param value - The digits the log printed.
 * @param unit - `ms`, `s` or `m`.
 * @returns Seconds.
 */
function durationSeconds(value: string, unit: string): number {
  const n = Number(value)
  if (unit === 'ms') return n / 1000
  return unit === 'm' ? n * 60 : n
}

/**
 * Every failed test a running log names, in the order it names them.
 *
 * @param log - The log so far (ANSI already stripped).
 * @returns The failed tests.
 */
function failedTests(log: string): FailedTest[] {
  const out: FailedTest[] = []
  for (const line of log.split('\n')) {
    const m = LIST_RESULT_LINE.exec(line)
    if (!m || m[1] !== '✘') continue
    const { where, title } = splitTitlePath(m[2])
    out.push({ where, title, seconds: durationSeconds(m[3], m[4]) })
  }
  return out
}

/**
 * The error a failure block reports: the first line of its body that names a thrown error
 * (`TimeoutError: page.waitForURL: Timeout 10000ms exceeded.`), else its first real line.
 *
 * The body's first line is usually the runner's own sentence (`Test timeout of 15000ms exceeded
 * while running "beforeEach" hook.`), which changes with the hook; the thrown error below it is
 * what repeats verbatim, so it is preferred.
 *
 * @param body - The block's lines, from {@link failureBody}.
 * @returns The error line, or null when the block has no body.
 */
function failureErrorLine(body: string[]): string | null {
  const thrown = body.find((l) => /^[A-Za-z_$][\w.$]*(?:Error|Exception)\b/.test(l))
  return thrown ?? body[0] ?? null
}

/**
 * A failure block's own words, one per line: its body without the runner's progress lines (the
 * `list` reporter interleaves them with the `line` reporter's blocks), without a code frame or an
 * `at …` line (where the error happened, not what it said), and without the report's file list.
 *
 * @param block - One block from {@link failureBlocks}.
 * @returns The body's lines, ANSI stripped and trimmed.
 */
function failureBody(block: string): string[] {
  return block
    .split('\n')
    .slice(1)
    .map((l) => l.replace(ANSI_SGR, '').trim())
    .filter(
      (l) =>
        l &&
        !LIST_RESULT_LINE.test(l) &&
        !/^(?:at\s|\d+ \||>\s*\d+ \||\|)/.test(l) &&
        !/^Error Context:/.test(l),
    )
}

/**
 * What a failure block says the failure is ABOUT, when its error line does not already say it:
 * the locator it waited for, the navigation it waited on, or the locator and the expected/received
 * pair of a failed assertion.
 *
 * Without this, every `TimeoutError: page.press: Timeout 5000ms exceeded.` in a log is one
 * message, because that line names the ACTION (`page.press`) and never its subject. X1 flash-m84
 * (2026-10-16) had four such failures in one run — one waiting on
 * `button:has-text("Publish Article")`, one on `.article-preview h1`, one on
 * `.article-preview').first().locator('.author')`, one on a generated `h1:has-text("Test
 * Article …")` — and the run's summary called them two causes while its mid-run note called them
 * one. The subject is what separates causes; it is in the block, and nothing else in the block
 * carries it.
 *
 * @param body - The block's lines, from {@link failureBody}.
 * @returns The detail line, or null when the block names none.
 */
function failureDetail(body: string[]): string | null {
  const waited = body.find((l) =>
    /^-?\s*waiting for (?:locator\(|navigation|element|selector)/.test(l),
  )
  if (waited !== undefined) return waited.replace(/^-\s*/, '')
  // A failed assertion names its locator and the two values that differ.
  const locator = body.find((l) => /^Locator:\s/.test(l))
  if (locator === undefined) return null
  const parts = [
    locator,
    body.find((l) => /^Expected\b/.test(l)),
    body.find((l) => /^Received\b/.test(l)),
  ]
  return parts.filter((p): p is string => p !== undefined).join(' · ')
}

/** The longest one body line a cause's recap carries before it is shortened. */
const FAILURE_EVIDENCE_CHARS = 200

/**
 * The two body lines worth carrying beside a cause's signature: the values that differ
 * (`Expected:` / `Received:`), or — where the failure asserts no pair — the locator from the
 * `Call log` and the error line that follows it.
 *
 * The signature is normalised ({@link normalizedSignature}): `Expected: 100000` becomes
 * `Expected: <n>`, and a signature built from a `waiting for` line never carries the assertion
 * values at all. Those values are what a fix round needs, and the run's stdout they came from is
 * cut in the MIDDLE by the tool-result cap, so a listed cause that does not carry them sends the
 * executor back to the log — xr-molecule-flash-m102 (+12:43) made four `grep -A` round trips
 * (~25 s) for the bodies of causes the note had already listed.
 *
 * @param body - The block's lines, from {@link failureBody}.
 * @param message - The cause's signature: a line it already carries is not repeated.
 * @returns Up to two lines, most useful first (empty when the body names none).
 */
function failureEvidence(body: string[], message: string | null): string[] {
  const carried = (line: string): boolean => message !== null && message.includes(line)
  // A strict-mode violation lists the elements it resolved to, and that list is the fix's own
  // address: `1) <button class="… action-btn">` and `2) <button class="…">` name where each
  // duplicate is written. They were dropped here (the first body line is the signature, and the
  // only later `Error:` line this read for is absent), so xr-molecule-flash-m122's run read
  // "resolved to 2 elements:" followed by nothing and fixed a duplicate on a page its failing
  // test never visits. Kept whole — a locator list is what the executor has to match to a file.
  if (message !== null && /resolved to \d+ elements?/i.test(message)) {
    const elements = body.filter((line) => /^\d+\)\s/.test(line))
    if (elements.length > 0) return elements.slice(0, 2)
  }
  const expected = body.find((l) => /^Expected\b/.test(l))
  const received = body.find((l) => /^Received\b/.test(l))
  if (expected !== undefined && received !== undefined) return [expected, received]
  const picked: string[] = []
  const waiting = body.find((l) =>
    /^-?\s*waiting for (?:locator\(|navigation|element|selector)/.test(l),
  )
  if (waiting !== undefined) picked.push(waiting.replace(/^-\s*/, ''))
  const locator = body.find((l) => /^Locator:\s/.test(l))
  if (locator !== undefined) picked.push(locator)
  // The first body line IS the error the signature already names; a later `Error:` line is the
  // detail that explains it (a strict-mode violation, the two elements it resolved to).
  const detail = body.slice(1).find((l) => /^Error:\s/.test(l))
  if (detail !== undefined) picked.push(detail)
  return picked.filter((line) => !carried(line)).slice(0, 2)
}

/**
 * A cause signature with the values that differ between two tests of ONE cause replaced by `<n>`:
 * a duration, a generated id or timestamp, a host's port.
 *
 * The duration is the one that matters. A suite that sets `actionTimeout: 5_000` — the X1
 * realworld suite does — spends `5 s` plus teardown on every "the locator never appeared"
 * failure, so `~7 s` is a property of the CONFIG, not of the cause, and four different missing
 * elements print the same number (X1 flash-m84, 2026-10-16). Two tests waiting on the same
 * locator for 5 s and for 10 s wait for the same thing; two waiting on different locators do not
 * become one cause by timing out together.
 *
 * @param s - An error line, with its detail.
 * @returns The signature.
 */
function normalizedSignature(s: string): string {
  return (
    s
      // A duration: the suite's own timeout, in whatever unit the runner printed.
      .replace(/\b\d+(?:\.\d+)?\s*(?:ms|s|m)\b/g, '<n>')
      // A host's port. The shape is what makes it a port: a bare `:32` is a line number.
      .replace(/\b(\d{1,3}(?:\.\d{1,3}){3}|localhost|0\.0\.0\.0):\d+/g, '$1:<n>')
      // A generated id, a timestamp, a serial: five digits or more is no part of a selector.
      .replace(/\b\d{5,}\b/g, '<n>')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
  )
}

/**
 * The per-test budget a failure block's own message names, in ms, or null. Only the runner's
 * budget kill (`Test timeout of 15000ms exceeded`) is read: a locator wait's own
 * `Timeout 5000ms exceeded` is the config's action timeout, not the budget a test body has to fit
 * its repeated work into.
 *
 * @param block - One failure block, as {@link failureBlocks} splits them.
 * @returns The budget in ms, or null.
 */
function failureBudgetMs(block: string): number | null {
  const m = /\bTest timeout of (\d+)ms exceeded\b/.exec(block.replace(ANSI_SGR, ''))
  return m ? Number(m[1]) : null
}

/**
 * The cause signature with the budget it normalized away put back: `Test timeout of <n> exceeded`
 * becomes `Test timeout of 15000ms exceeded`. Every other `<n>` stays — those are the values that
 * differ between tests of one cause, while the budget is the one that does not, and it is what
 * turns "a timeout" into "15 creates in 15 s" (xr-molecule-flash-m110 +20:44).
 *
 * @param message - The normalized signature.
 * @param budgetMs - The budget the cause's first block printed.
 * @returns The signature to print.
 */
function signatureWithBudget(message: string, budgetMs: number): string {
  return message.replace(/Test timeout of <n> exceeded/, `Test timeout of ${budgetMs}ms exceeded`)
}

/**
 * What separates one cause from another in a `playwright test` log: the error CLASS plus the
 * normalized message — the error line, the thing it waited for or asserted on, and the values
 * with the test's own data normalized out.
 *
 * One test printed twice, or two tests failing the same way, share a signature; two tests whose
 * errors differ in their locator do not, however alike the rest of the line is.
 *
 * @param block - One block from {@link failureBlocks}.
 * @returns The signature, or null when the block has no body.
 */
function failureMessage(block: string): string | null {
  const body = failureBody(block)
  const line = failureErrorLine(body)
  if (line === null) return null
  const detail = failureDetail(body)
  const signature = detail !== null && !line.includes(detail) ? `${line} — ${detail}` : line
  return normalizedSignature(signature)
}

/**
 * The largest group of items sharing a key.
 *
 * @param groups - Keyed groups, in the order they were built.
 * @returns The largest group's key and members, or null when there are none.
 */
function largestGroup<T>(groups: Map<string, T[]>): { key: string; members: T[] } | null {
  let best: { key: string; members: T[] } | null = null
  for (const [key, members] of groups) {
    if (!best || members.length > best.members.length) best = { key, members }
  }
  return best
}

/**
 * One test's identity in a log: where it sits and what it is called.
 *
 * A test printed twice by two reporters, or failed twice by a retry, is the same test — the
 * identity is what it is called and where it lives, never which line of the log it came from.
 *
 * @param t - A failed test.
 * @returns The key two prints of one test share.
 */
function testKey(t: FailedTest): string {
  return `${t.where}|${t.title}`
}

/**
 * One test's identity with the runner's retry marker taken off: `… a.spec.ts:32 › does x
 * (retry #1)` is the same test as `… a.spec.ts:32 › does x`.
 *
 * A retried failure prints twice in a `list` log — its first attempt, then the same test with
 * `(retry #1)` after the title — while its failure block names it without the marker. Keyed
 * literally, the retry row is a test no cause claims, so it fell through to the duration arm and
 * was listed as a "shared duration" cause beside the proven cause it repeated: on
 * xr-molecule-flash-m155 (+21:50) every retry row of the run became one of six extra causes
 * duplicating the causes above them.
 *
 * @param t - A failed test, as a result line or a failure block spelled it.
 * @returns The key a test's retry row shares with its failure block.
 */
function retrylessTestKey(t: FailedTest): string {
  return `${t.where}|${t.title.replace(/\s*\(retry #\d+\)$/, '')}`
}

/**
 * The same tests with each one kept once, in first-seen order.
 *
 * @param tests - Failed tests, as the log printed them (possibly more than once each).
 * @returns The distinct tests.
 */
function distinctTests(tests: FailedTest[]): FailedTest[] {
  const seen = new Set<string>()
  return tests.filter((t) => {
    const key = testKey(t)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The cause repeating among a running suite's failures, or null.
 *
 * Playwright's `list` reporter prints one line per test as it finishes — its mark, its title
 * path and how long it ran — and, on a run the platform started in the background, each failure's
 * own error with it ({@link PLAYWRIGHT_FAILURES_INLINE_ENV}); a `list` run with no error bodies in
 * its log (an older Playwright, a log the bodies have been cut from) carries only the duration as
 * a signature. Where the log carries the failure bodies (either inline, or in a finished run's
 * summary) the signature is the
 * error itself — {@link failureMessage}: the error class plus the locator or the values that
 * differ — which is stronger (it needs no assumption about how long a failure should take), so
 * the message is looked for first and the duration is then left with the tests whose bodies the
 * log does NOT carry.
 *
 * Either way the point is the same: a suite whose failures repeat one cause spends its whole
 * runtime proving that one cause, and the executor watching it can be told so at the third
 * failure instead of at the last. X1 flash-m76 walked 15 tests in 4.0 minutes where 15.6 s
 * each was the test timeout and one missing `navigate('/')` was the cause of all of them.
 *
 * The quorum is of DISTINCT tests — {@link REPEATING_FAILURE_MIN} of them — because a log that
 * prints each failure twice (a second reporter, a retry) had X1 flash-m83 told that four of its
 * tests had failed the same way when two had, so the executor stopped a 139-test walk at test 21
 * with one cause in hand (2026-10-16).
 *
 * @param log - The log so far.
 * @returns The repeating cause, or null when no signature has {@link REPEATING_FAILURE_MIN}
 *   distinct tests behind it.
 */
export function repeatingFailure(log: string): RepeatingFailure | null {
  const text = log.replace(ANSI_SGR, '')
  // The failure BODIES first: a message repeating verbatim names the cause itself. Grouped by
  // DISTINCT test, so the largest group is the cause the most tests share — not the one whose
  // failures happen to have been printed the most times.
  const byMessage = new Map<string, FailedTest[]>()
  const withBody = new Set<string>()
  for (const block of failureBlocks(text)) {
    const m = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    const { where, title } = splitTitlePath(m?.[1] ?? '')
    const message = failureMessage(block)
    if (message === null) continue
    withBody.add(testKey({ where, title, seconds: null }))
    const group = byMessage.get(message)
    if (group) group.push({ where, title, seconds: null })
    else byMessage.set(message, [{ where, title, seconds: null }])
  }
  const distinctByMessage = new Map<string, FailedTest[]>()
  for (const [message, members] of byMessage) distinctByMessage.set(message, distinctTests(members))
  const messageGroup = largestGroup(distinctByMessage)
  if (messageGroup && messageGroup.members.length >= REPEATING_FAILURE_MIN)
    return {
      count: messageGroup.members.length,
      message: messageGroup.key,
      seconds: null,
      tests: messageGroup.members,
    }
  // Otherwise the durations — of the tests the log says nothing ELSE about. A test whose failure
  // body is in the log has a signature, and how long it took must not overrule it: a suite whose
  // config sets a timeout makes every failure that waits for anything land on the same number, so
  // the duration would merge causes the bodies just separated (X1 flash-m84, 2026-10-16 — four
  // failures at 6.8-7.4 s, four locators, `actionTimeout: 5_000`). What is left is the shape this
  // was written for: a `list`-only log, or a run whose bodies have not been printed yet, where
  // the duration is the ONLY signature the log carries. A test that runs to its timeout prints
  // slightly different durations on each attempt (15.6 s, 15.1 s, 15.0 s), so the band is 0.5 s
  // or 5% of the duration, whichever is larger.
  const tests = distinctTests(failedTests(text)).filter((t) => !withBody.has(testKey(t)))
  const withSeconds = tests.filter((t): t is FailedTest & { seconds: number } => t.seconds !== null)
  let best: Array<FailedTest & { seconds: number }> = []
  for (const t of withSeconds) {
    const band = Math.max(0.5, t.seconds * 0.05)
    const near = withSeconds.filter((x) => Math.abs(x.seconds - t.seconds) <= band)
    if (near.length > best.length) best = near
  }
  if (best.length < REPEATING_FAILURE_MIN) return null
  const mean = best.reduce((sum, t) => sum + t.seconds, 0) / best.length
  return { count: best.length, message: null, seconds: Math.round(mean * 10) / 10, tests: best }
}

/**
 * Whether the log read so far carries a failure's own body under a `✘` row — the evidence that a
 * run prints each failure's error as that test fails ({@link PLAYWRIGHT_FAILURES_INLINE_ENV}).
 *
 * `wait_for_task` promises the executor that each failure's report sits right under its `✘` line
 * only when the log proves it. The command's shape cannot answer: the launch sets the switch on
 * every background command (the executor's wrapper script inherits it), so a wrapper this reader
 * cannot place is exactly as covered as `npx playwright test` ({@link streamingBackgroundCommand}).
 * The log is the evidence — a `1) [project] › spec › title ───` block whose test the log also
 * printed with `✘` ({@link failureBlocks}).
 *
 * A block alone is not enough: a FINISHED run's end-of-run summary carries the same blocks, and a
 * running wait must not be told "as it fails" about a log whose bodies only appear at the end.
 * During a wait the run has not ended (the exit file is read first), so a block beside a `✘` row
 * is one the reporter printed inline.
 *
 * @param log - A log, or the slice of one a wait reads.
 * @returns True when a `✘` row's own test has a failure body under it.
 */
export function logShowsInlineFailureBodies(log: string): boolean {
  const text = log.replace(ANSI_SGR, '')
  const failed = new Set(distinctTests(failedTests(text)).map(retrylessTestKey))
  if (failed.size === 0) return false
  for (const block of failureBlocks(text)) {
    const m = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    if (m === null) continue
    const { where, title } = splitTitlePath(m[1] ?? '')
    if (failed.has(retrylessTestKey({ where, title, seconds: null }))) return true
  }
  return false
}

/** How many of a repeating cause's failures the note lists before it says "and N more". */
export const REPEATING_FAILURE_LISTED = 5

/**
 * The platform's cap on one tool result's text: `MAX_TOOL_OUTPUT_CHARS` in molecule-dev's
 * `api/src/ai/chat-handler.ts`, which cuts a longer string field's MIDDLE. A finished run's
 * stdout is cut to it, so the cause list must not depend on reading the log back — and must
 * itself fit inside it, or the cut lands in the list.
 */
export const TOOL_RESULT_CHARS = 8000

/**
 * The characters a finished run's cause list may use of {@link TOOL_RESULT_CHARS}. The recap
 * measured by xr-molecule-flash-m102 (+12:43) was `12 failures, 8 causes`: one cause line is
 * ~200 chars and ~80 more with its two body lines, so 8 causes is ~2.3 k against the 8 k cap —
 * the old 5-cause cap withheld 3 causes that the same result had room for.
 *
 * The rest of the cap is left to the header, the narrowed re-run command and the exclusion
 * line, which ride the same note.
 */
export const FAILURE_CAUSES_CHARS = TOOL_RESULT_CHARS - 2600

/**
 * How many causes a finished run's summary lists at most. The character budget above is the
 * bound that must hold (it is what keeps the note on the surviving side of the tool-result
 * cut); this is the bound past which a list stops being read at all.
 */
export const FAILURE_CAUSES_LISTED = 12

/** The room the "and N more causes" sentence gets inside {@link FAILURE_CAUSES_CHARS}. */
const FAILURE_CAUSES_OMITTED_CHARS = 800

/** How many of one cause's tests that summary names before it says "and N more". */
export const FAILURE_CAUSE_TESTS_LISTED = 6

/**
 * The shortest unambiguous tail of a logged path's FILE (`…/specs/e2e/articles.spec.ts` →
 * `e2e/articles.spec.ts`).
 *
 * Used only where a COUNT of files is what the sentence needs; every note that names a
 * test to the executor prints the path the log wrote, because that is the path its own
 * re-run hint names and the one the executor can paste back into a command (flash-m82
 * read a shortened `e2e/auth.spec.ts:19` as a file the app owned, and rewrote its config
 * over a suite path that was already right).
 *
 * @param file - A path as {@link specFile} returns it.
 * @returns The last two path segments.
 */
function shortFile(file: string): string {
  return file.split('/').slice(-2).join('/')
}

/**
 * The spec file a logged location names (`…/e2e/articles.spec.ts:32` → `…/e2e/articles.spec.ts`).
 *
 * @param where - A location from {@link FailedTest.where}.
 * @returns The path without its line number.
 */
function specFile(where: string): string {
  return where.replace(/:\d+$/, '')
}

/**
 * The mark of every test result a log names, in the order it printed them (`✘` failed, `✓`
 * passed).
 *
 * A `line`-only log writes none: `[n/N] <title>` carries no mark. An empty list therefore means
 * the log cannot say whether anything passed, not that nothing did.
 *
 * @param text - The log (ANSI already stripped).
 * @returns The marks.
 */
function resultMarks(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const m = LIST_RESULT_LINE.exec(line)
    if (m) out.push(m[1])
  }
  return out
}

/**
 * Every test the log's numbered failure blocks name, in the order it names them.
 *
 * @param text - The log (ANSI already stripped).
 * @returns The failed tests, with the location and title their header carries.
 */
function failureBlockTests(text: string): FailedTest[] {
  return failureBlocks(text).map((block) => {
    const m = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    const { where, title } = splitTitlePath(m?.[1] ?? '')
    return { where, title, seconds: null }
  })
}

/**
 * Distinct spec FILES a repeating cause must span — with every failure sharing it and nothing
 * passing since — before a run is called broken for the whole suite.
 *
 * One file's failures can be that file's own setup, so a cause confined to one file is never
 * this. Across {@link UNIVERSAL_CAUSE_FILES} files, on the other hand, whatever it is is a
 * property of the run rather than of a page.
 */
export const UNIVERSAL_CAUSE_FILES = 3

/** A repeating cause that is failing the WHOLE run — see {@link universalCause}. */
export interface UniversalCause {
  /** How many distinct tests share it. */
  count: number
  /** The distinct spec files they live in, in the order the log named them. */
  files: string[]
  /**
   * The cause is that the page rendered NOTHING: every failure so far is a wait for an element
   * the page never painted, whatever the selector asked for ({@link emptyPageCause}). One cause
   * is failing every test even though no two failures share an error signature, so the note says
   * so in the page's terms instead of naming one locator as the signature.
   */
  pageRendersNothing?: true
  /** The page's own uncaught error, when the run printed one. */
  pageError?: string
  /**
   * The distinct failures this cause covers, in log order — the rows a note lists for
   * {@link pageRendersNothing}. Absent for a signature cause, whose rows are the repeating
   * failure's own tests.
   */
  tests?: FailedTest[]
}

/**
 * How many tests a run must have walked — with nothing passing since its first failure — before
 * "the page renders nothing" can be its one cause.
 *
 * THREE, and the number is the cost of the alternative. The old floor of 15 was chosen when the
 * reading was only offered at a completed run; once it STOPS the walk, every test waited for is
 * a test whose result is thrown away, and a blank page costs its per-test budget each time
 * (m177: 18 tests, ~4.2 minutes, on a page whose thrown error was visible in the first
 * `pageerror`). Three is the smallest count that is not one page's own bug: the cause additionally
 * needs three DISTINCT spec files (`UNIVERSAL_CAUSE_FILES`, or the files a narrowed run selected),
 * no failure showing a locator RESOLVING ({@link ELEMENT_FOUND} — a blank page cannot resolve
 * one), and no test passing after the first failure. A page that renders misses elements, but
 * three unrelated specs in three files failing at three different locators that never resolved,
 * with nothing passing in between, is the page, not three bugs. At the suite's own 5 s action
 * timeout that verdict lands ~20 s into the walk, so the early stop costs about one test's worth
 * of time instead of fifteen.
 */
export const EMPTY_PAGE_CAUSE_TESTS = 3

/**
 * A failure body whose whole complaint is a wait for an element the page never rendered:
 * Playwright's `waiting for locator(…)` call log, its `element(s) not found` line, or the
 * assertion form's `toBeVisible() failed`. Anything else — a status code, a thrown error in the
 * test's own code — is a different failure and leaves this reading nothing.
 */
const LOCATOR_WAIT = /waiting for locator\(|element\(s\) not found|toBeVisible\(\) failed/

/**
 * A failure body that shows the page PAINTED: Playwright's call log RESOLVED the locator to an
 * element (`locator resolved to <i …>`, `resolved to 2 elements`) and only then found it
 * unusable (`element is not visible` / `not enabled` / `not stable` / `not attached`, `outside
 * of the viewport`). A blank page cannot resolve a locator, so one of these anywhere in a run
 * disproves {@link emptyPageCause}.
 *
 * xr-molecule-flash-m187 (+15:39 and +18:54) narrowed two re-runs to the tests that had just
 * failed, and both were stopped as "the app is rendering NOTHING" while every block in the log
 * carried `locator resolved to <i class="ion-close-circled"></i>` followed by `element is not
 * visible` — the page was drawn, and only an icon had no box.
 */
const ELEMENT_FOUND =
  /locator resolved to (?:<|[1-9]\d* elements?\b)|element is (?:not (?:visible|enabled|stable|attached)\b|outside of the viewport)/

/** An uncaught page error, as a run that listens for `pageerror` prints it. */
const PAGE_ERROR_LINE = /^\s*(?:\[pageerror\]|pageerror:)\s*(.+)$/m

/** An uncaught page error, in the browser's own `Uncaught …` wording. */
const UNCAUGHT_PAGE_ERROR_LINE = /^\s*Uncaught(?:\s+Error)?:\s*(.+)$/m

/**
 * The page's own uncaught error, when the log printed one — the fact that names WHY a build
 * paints nothing (`No 'auth-client' provider bonded…`), rather than the locator it leaves behind.
 *
 * @param text - The log (ANSI already stripped).
 * @returns The error's message, or null.
 */
function pageErrorInLog(text: string): string | null {
  const m = PAGE_ERROR_LINE.exec(text) ?? UNCAUGHT_PAGE_ERROR_LINE.exec(text)
  return m?.[1]?.trim() || null
}

/**
 * The "nothing has passed and nothing renders" cause: the run's FIRST consecutive failures — from
 * its first failed test, with no pass since — are all locator waits, at least
 * {@link EMPTY_PAGE_CAUSE_TESTS} of them across {@link UNIVERSAL_CAUSE_FILES} different spec
 * files, and NO failure block shows the page resolving the locator it waited for
 * ({@link ELEMENT_FOUND}).
 *
 * "No locator resolved" is the check that says the page painted nothing; it replaced an
 * earlier claim that each failure waits for its own spec's FIRST element, which the code never
 * verified and the log alone cannot verify (Playwright prints only the failing line, not the
 * spec's first one). A narrowed re-run of known failures meets every other condition by
 * construction — every test in it failed last time at a locator wait — so the page-painted
 * evidence is what keeps it from reading as an empty page. When the command names the
 * individual tests (`file:line`), a re-run of exactly those is also skipped
 * ({@link selectedTestRefs}): the executor is verifying fixes, and the stop would throw away
 * the verdict the re-run exists to give.
 *
 * The file span stays at {@link UNIVERSAL_CAUSE_FILES} whatever the run selected: "the page
 * renders nothing" is a claim about the APP, and one file's failures can be that file's own setup
 * (a broken login helper fails every test of one spec at its first locator). A run narrowed to one
 * or two files still has the signature and connection causes for a whole-run stop.
 *
 * Stops the walk as soon as that verdict is readable, not after a fixed floor of failures have
 * been burned: the page error arrives with the first test, so every further test only repeats it.
 *
 * This is ONE cause even though the signatures differ — each spec asks for its own first element
 * (`input[name="username"]`, `a.navbar-brand`, `h1`), so {@link repeatingFailure} cannot group
 * them and {@link universalCause}'s signature test cannot see the run is over. xr-molecule-flash-
 * m141 (+20:30) walked a built app that rendered nothing: 36 tests had failed, every one at its
 * first locator, and the note told the run to keep walking for another ~9 minutes. xr-molecule-
 * flash-m177 (+08:38 → +12:52) repeated it: 18 tests, one whole walk, on a page whose
 * `PAGEERROR No 'auth-client' provider bonded` was in the log from the first one.
 *
 * @param text - The log (ANSI already stripped).
 * @param found - The repeating cause {@link repeatingFailure} found, when it found one.
 * @param command - How the run was started, when the caller knows it: a command naming the
 *   individual tests it selects marks a re-run of known failures ({@link selectedTestRefs}).
 * @returns The cause, or null when the log is not this shape.
 */
function emptyPageCause(
  text: string,
  found: RepeatingFailure | null,
  command?: string | null,
): UniversalCause | null {
  const marks = resultMarks(text)
  const firstFailure = marks.indexOf('✘')
  if (firstFailure === -1 || marks.slice(firstFailure).includes('✓')) return null
  const blocks = failureBlocks(text)
  if (blocks.length === 0 || !blocks.every((block) => LOCATOR_WAIT.test(block))) return null
  // A blank page cannot RESOLVE a locator: `locator resolved to …` (or an actionability outcome
  // like `element is not visible`) means the page painted and only the element's box or
  // visibility was wrong. xr-molecule-flash-m187 stopped two narrowed re-runs on exactly this.
  if (blocks.some((block) => ELEMENT_FOUND.test(block))) return null
  // Both readings of the same failures: a `list` line carries the test and its duration, a
  // numbered block carries its body. The larger is the count — a failure that has a block but
  // whose result line the poll had not reached yet is still a failure.
  const byList = distinctTests(failedTests(text))
  const byBlock = distinctTests(failureBlockTests(text))
  const tests = byBlock.length >= byList.length ? byBlock : byList
  // A run whose command names individual tests, and whose every failure is one of them, is a
  // re-run of known failures, never an empty-page stop: the executor is checking fixes it just
  // made, and stopping it throws away that verdict (xr-molecule-flash-m187, twice).
  const selected = command ? selectedTestRefs(command) : null
  if (
    selected !== null &&
    tests.length > 0 &&
    tests.every((test) => selected.some((ref) => sameTestRef(ref, test.where)))
  ) {
    return null
  }
  // One signature already covers every failure: that is the signature cause, and its wording
  // (which names the repeated error) says more than "the page renders nothing" would.
  if (found !== null && found.message !== null && found.count >= tests.length) return null
  // The cause is the FIRST consecutive failures: `tests` starts at the first ✘ and no ✓ follows
  // it, so a page that has failed three tests in a row across three files has already said
  // everything the rest of the walk can say (m177 paid 4.2 minutes learning that).
  if (tests.length < EMPTY_PAGE_CAUSE_TESTS) return null
  const files = [...new Set(tests.map((t) => specFile(t.where)).filter(Boolean))]
  // The blank-page claim is cross-file by construction (see the doc): a selected-file count
  // below the span does not shrink it, it removes the claim.
  if (files.length < UNIVERSAL_CAUSE_FILES) return null
  const pageError = pageErrorInLog(text)
  return {
    count: tests.length,
    files,
    pageRendersNothing: true,
    ...(pageError === null ? {} : { pageError }),
    tests,
  }
}

/**
 * How many tests a connection-class cause must cover before the run is stopped even when they
 * are all in one file — see {@link universalCause}.
 */
export const CONNECTION_CAUSE_TESTS = 3

/**
 * The failures that mean the browser never reached the app: neither the page's code nor a
 * selector can be the cause, and every remaining test can only repeat it.
 */
const CONNECTION_CAUSE = /\bpage\.goto\b[^\n]*\btimeout\b|\bnet::ERR_[A-Z0-9_]+\b|\bECONNREFUSED\b/i

/** A Playwright positional argument that names one test file (`e2e/auth.spec.ts:19:3`). */
const SPEC_FILE_ARG = /\.(?:spec|test)\.[cm]?[jt]sx?(?::\d+(?::\d+)?)?$/

/**
 * The `playwright test` flags that take the next word as their value when they are not written
 * `--flag=value`. A flag NOT in this set is a switch (`--headed`, `--last-failed`), so the word
 * after it is a positional filter and not a value.
 */
const PLAYWRIGHT_VALUE_FLAGS: ReadonlySet<string> = new Set([
  '-c',
  '-g',
  '-j',
  '-x',
  '--config',
  '--global-timeout',
  '--grep',
  '--grep-invert',
  '--max-failures',
  '--output',
  '--project',
  '--repeat-each',
  '--reporter',
  '--retries',
  '--shard',
  '--timeout',
  '--trace',
  '--ui-host',
  '--ui-port',
  '--workers',
])

/**
 * How many test FILES a Playwright run's own command narrows it to, or null when it selects the
 * whole suite (or its selection cannot be read).
 *
 * {@link universalCause}'s file threshold is written for a whole-suite run, which a narrowed run
 * can never reach. xr-molecule-flash-m119 (+42:08) re-ran ONE spec file against a hand-started
 * `vite preview` the browser could not reach, and every test in it failed `page.goto: Timeout` —
 * but one file is below {@link UNIVERSAL_CAUSE_FILES}, so the wait sat out its entire 280 s
 * budget on a run that had already measured all it could.
 *
 * The command is read through {@link commandSegments}, so a `playwright test` named as an
 * argument is not a run. A {@link PLAYWRIGHT_VALUE_FLAGS} flag written without `=` takes the next
 * word as its value, so a `--config app/e2e-suite.config.ts` is never counted as a spec file; a
 * directory or a bare substring filter names files the command does not list, which answers null
 * (the whole-suite threshold) rather than a count of the wrong files.
 *
 * @param command - The run's command.
 * @returns The number of distinct test files it names, or null when it names none (the whole
 *   suite) or the selection cannot be told.
 */
export function specFilesSelected(command: string): number | null {
  for (const segment of commandSegments(command)) {
    if (!/^playwright\s+test\b/.test(segment.text)) continue
    const files = new Set<string>()
    let flagValue = false
    for (const word of segment.args.slice(1)) {
      const token = word.replace(/^(['"])(.*)\1$/, '$2')
      if (flagValue) {
        flagValue = false
        continue
      }
      if (token.startsWith('-')) {
        const flag = token.includes('=') ? token.slice(0, token.indexOf('=')) : token
        flagValue = !token.includes('=') && PLAYWRIGHT_VALUE_FLAGS.has(flag)
        continue
      }
      if (SPEC_FILE_ARG.test(token)) {
        files.add(token.replace(/:\d+(?::\d+)?$/, ''))
        continue
      }
      // A directory (`e2e/`), a glob, or a bare substring filter (`npx playwright test login`):
      // the command does not name the files it selects, so there is no count to take.
      return null
    }
    return files.size > 0 ? files.size : null
  }
  return null
}

/** One test a command selects by `file:line`, as the command wrote the path (relative to its cwd). */
interface SelectedTestRef {
  path: string
  line: number
}

/**
 * The individual tests a `playwright test` command names (`file:line` positionals), or null when
 * it selects whole files, a directory, a glob, a bare filter, or nothing at all.
 *
 * A command that names `file:line` tests is a re-run of tests that already failed — the shape
 * {@link emptyPageCause} must not read as "the page renders nothing", because the executor is
 * verifying fixes and the stop throws that verdict away (xr-molecule-flash-m187, twice).
 *
 * @param command - The run's command.
 * @returns The selected test references, or null when the selection is not per-test.
 */
function selectedTestRefs(command: string): SelectedTestRef[] | null {
  for (const segment of commandSegments(command)) {
    if (!/^playwright\s+test\b/.test(segment.text)) continue
    const refs: SelectedTestRef[] = []
    let flagValue = false
    for (const word of segment.args.slice(1)) {
      const token = word.replace(/^(['"])(.*)\1$/, '$2')
      if (flagValue) {
        flagValue = false
        continue
      }
      if (token.startsWith('-')) {
        const flag = token.includes('=') ? token.slice(0, token.indexOf('=')) : token
        flagValue = !token.includes('=') && PLAYWRIGHT_VALUE_FLAGS.has(flag)
        continue
      }
      const m = /^(.*\.(?:spec|test)\.[cm]?[jt]sx?):(\d+)(?::\d+)?$/.exec(token)
      if (!m) return null
      refs.push({ path: m[1]!, line: Number(m[2]) })
    }
    return refs.length > 0 ? refs : null
  }
  return null
}

/**
 * Whether a failing test (`file:line`, as the log printed it) is the test one of the command's
 * `file:line` selectors names.
 *
 * Paths are compared by suffix: the log prints the path from the suite root
 * (`fixtures/conduit-spec/specs/e2e/articles.spec.ts:229`) while the command names it from its
 * own cwd (`articles.spec.ts:229`), so neither is a prefix of the other.
 *
 * @param ref - One selected test reference.
 * @param where - The failed test's `file:line` (see {@link splitTitlePath}).
 * @returns True when they name the same test.
 */
function sameTestRef(ref: SelectedTestRef, where: string): boolean {
  const m = /^(.*\.(?:spec|test)\.[cm]?[jt]sx?):(\d+)$/.exec(where)
  if (!m || Number(m[2]) !== ref.line) return false
  const path = m[1]!
  return path === ref.path || path.endsWith(`/${ref.path}`) || ref.path.endsWith(`/${path}`)
}

/**
 * Whether a repeating cause is failing the whole run — the one case where stopping it is the
 * right call.
 *
 * The test is: the cause accounts for every failure the log names, it has hit the spec-file
 * threshold, and nothing has passed since its first failure. The threshold is
 * {@link UNIVERSAL_CAUSE_FILES} for a whole-suite run but the number of files the command
 * SELECTED for a narrowed one ({@link specFilesSelected}): a one-file run can never span three,
 * and xr-molecule-flash-m119 (+42:08) waited out its whole budget on exactly that shape. An app
 * that is not up, a 5xx on every request, or a selector that is missing on every page all look
 * like that, and every remaining test will fail the same way — so the run's remaining minutes
 * measure nothing. A CONNECTION-class cause ({@link CONNECTION_CAUSE}) needs no file span at all:
 * three tests that could not reach the app, with nothing passing since, is the app-unreachable
 * case however few files the run walks.
 *
 * Anything less is NOT this: a cause that stops at one file of a multi-file run, or that leaves
 * other tests passing, or that shares the run with failures of another shape, leaves the run with
 * something to say, and the run is the only thing that will say it. X1 flash-m83 (2026-10-16)
 * stopped eight local runs at their first repeating cause over 14.5 minutes and never finished
 * one; three of its deploys each fixed a single cause that a finished run would have listed
 * alongside the others.
 *
 * @param log - The log so far.
 * @param found - The repeating cause {@link repeatingFailure} found in it, or null when no two
 *   failures share a signature (a page that renders nothing fails each spec at its own first
 *   locator — {@link emptyPageCause} still reads that run).
 * @param command - How the run was started, when the caller knows it: its spec-file selection
 *   scales the file threshold ({@link specFilesSelected}).
 * @returns The cause's count and files, or null when the run is not failing whole.
 */
export function universalCause(
  log: string,
  found: RepeatingFailure | null,
  command?: string | null,
): UniversalCause | null {
  const text = log.replace(ANSI_SGR, '')
  // The threshold is what THIS run selects, not the suite's total: a run narrowed to one file
  // can never span three of them, however whole its failure is.
  const selected = command ? specFilesSelected(command) : null
  const threshold =
    selected === null ? UNIVERSAL_CAUSE_FILES : Math.min(UNIVERSAL_CAUSE_FILES, selected)
  // Nothing has passed and nothing renders: EVERY spec so far is waiting for an element the
  // page never painted, so the signatures differ while the cause does not (xr-molecule-flash-m141).
  const emptyPage = emptyPageCause(text, found, command)
  if (emptyPage) return emptyPage
  if (!found) return null
  const files = [...new Set(found.tests.map((t) => specFile(t.where)).filter(Boolean))]
  // The app never answered: three tests of that with nothing passing since is the whole of what
  // a whole-suite run would have said, whatever the file count (xr-molecule-flash-m119).
  const unreachable =
    found.message !== null &&
    CONNECTION_CAUSE.test(found.message) &&
    found.count >= CONNECTION_CAUSE_TESTS
  if (!unreachable && files.length < threshold) return null
  // Every failure the log names has to be this cause: another cause anywhere in the run means
  // the run still has something to say, and stopping it throws that away.
  const named = Math.max(
    distinctTests(failedTests(text)).length,
    distinctTests(failureBlockTests(text)).length,
  )
  if (found.count < named) return null
  // And nothing may have passed since its first failure. A pass after it means the app answered
  // a request, so a test that still fails the same way fails for a reason this run has not seen.
  const marks = resultMarks(text)
  const firstFailure = marks.indexOf('✘')
  if (firstFailure === -1 || marks.slice(firstFailure).includes('✓')) return null
  return { count: found.count, files }
}

/**
 * The ONE finding that ends a wait early, and the only one a note may hand a stop command over
 * for: a PROVEN cause that is failing the whole run.
 *
 * Both halves are load-bearing, each of them learned from a run that lost minutes to the other.
 *
 * - **Failing the WHOLE run** is {@link universalCause}: every failure the log names, across the
 *   spec-file threshold — {@link UNIVERSAL_CAUSE_FILES}, or the files a narrowed run's own
 *   command selects, or {@link CONNECTION_CAUSE_TESTS} tests of an app that never answered — with
 *   nothing passing since the first. That is the
 *   dont-stop-runs rule. X1 flash-m83 (2026-10-16) stopped eight local runs at their first
 *   repeating cause in 14.5 minutes and never finished one, and a run that still has other causes
 *   left to name is the only thing that will name them.
 * - **A PROVEN cause** is an error repeated VERBATIM. A shared DURATION is a LEAD, never a cause:
 *   a suite whose config sets a timeout spends that timeout on every failure that waits for
 *   anything, so three unrelated tests timing out together look exactly like one broken run
 *   (`~7 s` is a property of the CONFIG, not of the cause — {@link normalizedSignature}). X1
 *   xr-molecule-flash-m99 (2026-10-16) was told `status: 'repeating_failure'` twice on that
 *   shape — three `url-navigation.spec.ts` tests at ~16.2 s, one `timeout: 15_000` plus teardown
 *   — read the early return as "stop waiting, edit now", and voided a run that was still walking;
 *   the second cost a 224 s wait that ended with no result at all.
 *
 * Neither half alone is enough, and {@link repeatingFailure} finding a signature is not either:
 * that answers "is a cause repeating among this run's failures", which is worth telling the
 * executor mid-run as a NOTE while the wait goes on. This answers the narrower question the wait
 * needs — is the run over as a measuring instrument — and it is THE one predicate behind both
 * that decision and the note's wording, so the two cannot come to different verdicts.
 *
 * @param found - What {@link repeatingFailure} found mid-run, or null when no signature repeats.
 * @param universal - What {@link universalCause} found for it, if anything.
 * @returns The cause to stop the run over, or null — in which case nothing may be stopped, the
 *   wait keeps going, and the finding rides the run's result as a note.
 */
export function earlyReturnCause(
  found: RepeatingFailure | null,
  universal: UniversalCause | null | undefined,
): UniversalCause | null {
  // "The page renders nothing" is a PROVEN cause without a repeated signature — the specs differ
  // in the locator they wait for, not in the reason (xr-molecule-flash-m141) — so the duration
  // guard below does not apply to it.
  if (universal?.pageRendersNothing) return universal
  if (!found || found.message === null) return null
  return universal ?? null
}

/**
 * The titles a request excludes that a test's heading names — the ONE matcher for "is this
 * failure one the request does not count?".
 *
 * The request quotes a test's own title (`… except "should require login to post comment"`,
 * extracted by molecule-dev's `excludedTestTitles`) while a run's heading carries more of it
 * (`comments.spec.ts › Comments › should require login to post comment`), so containment is the
 * comparison. Whitespace is normalised and case is ignored: a brief may wrap the title across a
 * line (`xr-molecule-flash-m44`), and the reporter's own casing never has to match the brief's.
 *
 * Two readers used to answer this separately — the causes note (which therefore asked the
 * executor to fix a test the same result said not to) and molecule-dev's exclusion notes — and
 * xr-molecule-flash-m101 paid for the gap (+12:00: a turn and an edit spent on the excluded
 * test).
 *
 * @param heading - The text to match against: a test's title, its whole `file › describe › title`
 *   path, or (for a note that only has the run's output) the run's text.
 * @param excluded - The titles the request carves out, if the caller knows them.
 * @returns The excluded titles this heading names, in the request's order.
 */
export function matchingExcludedTitles(heading: string, excluded: readonly string[]): string[] {
  const normalise = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const haystack = normalise(heading)
  if (!haystack) return []
  return excluded.filter((title) => {
    const needle = normalise(title)
    return needle.length > 0 && haystack.includes(needle)
  })
}

/** One cause of failure in a run, and the tests it hit. */
export interface FailureCause {
  /** The error line its tests all reported, or null when only the duration ties them together. */
  message: string | null
  /** The duration they shared in seconds, or null when the error line is the signature. */
  seconds: number | null
  /** The distinct tests it hit, in the order the log named them. */
  tests: FailedTest[]
  /**
   * The FIRST failure's two most useful body lines — the values that differ, or the locator from
   * its `Call log` ({@link failureEvidence}) — so a fix round needs no re-read of the log. Empty
   * for a duration group, whose blocks carried no bodies.
   */
  evidence: string[]
  /**
   * The suite's own per-test budget in ms, when the cause is the test-budget kill
   * (`Test timeout of 15000ms exceeded`). The signature normalizes the number away
   * ({@link normalizedSignature}) so equal causes group, and that number is the one fact that
   * predicts a test spending its budget on a repeated action (xr-molecule-flash-m110 +20:44).
   */
  budgetMs?: number
  /**
   * The layer the failure came from ({@link classifyRunFailure}). A `connection` cause never
   * reached the app, so it is NOT a cause the app's code can fix: the note says to re-run it
   * once and read the app's log on a repeat, instead of sending a fix at a handler
   * (xr-molecule-flash-m110 +18:42 rewrote a CORS middleware for a 20 s connection timeout).
   */
  kind: RunFailureKind
  /**
   * What the page itself showed at the moment of the failure, when the caller read it from
   * Playwright's `error-context.md` (the alert / error list). The failure's own error line names
   * the symptom — `waitForURL` timed out — and never what the page was saying: xr-molecule-flash-
   * m122 +23:39 grouped eight `waitForURL` timeouts under one line while the page snapshots named
   * the cause (`email can't be blank`, `username can't be blank` — the settings form submitted
   * before its values had loaded). Attached to the cause so the fix needs no `cat` of the file.
   */
  pageShowed?: string[]
}

/** One failing test's page errors, as read from its `error-context.md`. */
export interface CausePageErrors {
  /** The test's location as the log prints it (`settings.spec.ts:107`). */
  where: string
  /** The alert / error items the page showed at the moment it failed. */
  items: readonly string[]
  /**
   * The landmark roles the test's page snapshot printed (`navigation`, `banner`), read from the
   * YAML block of its own `error-context.md`. Present ONLY when the caller has that test's
   * snapshot; an empty array means the snapshot was read and showed no landmark, while an absent
   * field means nothing was read and no claim may be made ({@link missingHeaderNote}).
   */
  landmarks?: readonly string[]
  /**
   * Whether the test's snapshot showed populated page content (headings, paragraphs, links,
   * list items, buttons), the other half of the missing-header reading: a page that painted its
   * main content but no navigation.
   */
  populated?: boolean
}

/**
 * Every failure a run names, grouped by the cause behind it — one group per cause, with the
 * tests it hit.
 *
 * The point is that ONE run yields EVERY cause. A Playwright report prints its failures one
 * after another with no statement of which of them share a cause, so a run of 19 failures is 19
 * bodies to read; X1 flash-m83 (2026-10-16) spent three deploys (6.7 minutes) each fixing a
 * single cause, two of them found by runs stopped before they walked the rest.
 *
 * The signature is the cause itself where the log carries the failures' bodies (a finished run, a
 * background `list` run — whose failures print as they fail — or a `line` reporter) —
 * {@link failureMessage}: the error class plus the locator or the values that differ — and how long
 * they took where it does not, which is why a duration group is labelled as a duration and not as a
 * proven cause. A test the log printed twice, or failed twice, is one test.
 *
 * A test the request EXCLUDES by name is not a cause to fix: its failure does not count for
 * this request ({@link matchingExcludedTitles}), so it is dropped here rather than handed to the
 * executor as work — a result that names it beside "it does not count" is the contradiction
 * xr-molecule-flash-m101 filed (+12:00: the model spent a turn and an edit on the excluded test,
 * on a page that was passing).
 *
 * @param log - The log of a finished or running run.
 * @param excluded - The test titles the request carves out, if the caller knows them.
 * @returns The causes, the one with the most tests first.
 */
export function failuresByCause(log: string, excluded: readonly string[] = []): FailureCause[] {
  return groupFailures(log, excluded).causes
}

/**
 * A finished run's own count of tests that failed their first attempt and passed on the retry:
 * Playwright's `  1 flaky`, printed in its closing tally.
 */
const FLAKY_TALLY_LINE = /^\s*[1-9]\d*\s+flaky\b/

/**
 * The tests a finished run's tally declares FLAKY (`  1 flaky` followed by their headings), keyed
 * the way a failure block is.
 *
 * Playwright prints a numbered failure block for the FIRST attempt of a test that then passes on
 * its retry, and also declares the test under `N flaky` — so a reader that only looks at the
 * blocks counts a flake as a cause to fix. xr-molecule-flash-m105's proof run against the deployed
 * URL reported ten `waitForURL` timing flakes as "causes" of a red run (+24:54), and the executor
 * spent its next minutes re-running them one by one until three passed untouched. The
 * declaration under the count is the runner's own answer, and its heading carries the same words
 * as the failure block's ({@link splitTitlePath} reads both the same way).
 *
 * @param text - The run's output, ANSI already stripped.
 * @returns Each flaky test, first seen first.
 */
function flakyTestsDeclared(text: string): FailedTest[] {
  const tests: FailedTest[] = []
  let underFlakyCount = false
  for (const line of text.split('\n')) {
    if (FLAKY_TALLY_LINE.test(line)) {
      underFlakyCount = true
      continue
    }
    if (!underFlakyCount) continue
    // The declaration lines are the reporter's own headings (`    [chromium] › a.spec.ts:5:1 › …`);
    // the first line that is not one ends them (the next tally line, or the end of the report).
    const heading = /^\s+\[[^\]\n]+\]\s*›\s*(.+)$/.exec(line)?.[1]
    if (heading === undefined) {
      underFlakyCount = false
      continue
    }
    const { where, title } = splitTitlePath(heading.replace(/[\s─]+$/, ''))
    tests.push({ where, title, seconds: null })
  }
  return distinctTests(tests)
}

/**
 * The causes a run's log names, the failures the request excludes, and the failures the runner
 * itself counted as flaky out of them.
 *
 * One grouping pass, because a note that lists the causes must know what it left out to say so
 * ({@link failureCausesNote}).
 *
 * @param log - The log of a finished or running run.
 * @param excluded - The test titles the request carves out.
 * @returns The causes to fix, the distinct tests dropped as excluded, and the distinct tests the
 *   runner counted as flaky (a retried pass is not a cause to fix).
 */
function groupFailures(
  log: string,
  excluded: readonly string[],
  pageErrors: readonly CausePageErrors[] = [],
): { causes: FailureCause[]; ignored: FailedTest[]; flaky: FailedTest[] } {
  const text = log.replace(ANSI_SGR, '')
  const flakyTests = flakyTestsDeclared(text)
  const flaky = new Set(flakyTests.map(testKey))
  const byMessage = new Map<
    string,
    { tests: FailedTest[]; evidence: string[]; budgetMs: number | null; kind: RunFailureKind }
  >()
  const named: FailedTest[] = []
  for (const block of failureBlocks(text)) {
    const message = failureMessage(block)
    if (message === null) continue
    const m = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    const { where, title } = splitTitlePath(m?.[1] ?? '')
    const test: FailedTest = { where, title, seconds: null }
    // The runner declared this test flaky: the block above is its first attempt, which it
    // passed on the retry, so it is neither a cause nor a failure to re-run.
    if (flaky.has(testKey(test))) continue
    named.push(test)
    if (matchingExcludedTitles(title, excluded).length > 0) continue
    const group = byMessage.get(message)
    if (group) group.tests.push(test)
    // The FIRST block with this signature carries the evidence: a later block of the same cause
    // says the same thing, and the first is the one the note's own line refers to. Its LAYER
    // rides along too: a cause that never reached the app is not an app-code fix
    // (`failure-kind.ts`).
    else
      byMessage.set(message, {
        tests: [test],
        evidence: failureEvidence(failureBody(block), message),
        budgetMs: failureBudgetMs(block),
        kind: classifyRunFailure(block)?.kind ?? 'assertion',
      })
  }
  const causes: FailureCause[] = []
  // The page's own words for a test, keyed the way both sides spell the location: the log's
  // `file:line` and the artifact's `file:line` are the same string from one run.
  const showedBy = new Map<string, readonly string[]>()
  for (const entry of pageErrors) if (entry.items.length > 0) showedBy.set(entry.where, entry.items)
  for (const [message, group] of byMessage) {
    const tests = distinctTests(group.tests)
    if (tests.length > 0) {
      // The first test of the cause that has page errors speaks for it: tests grouped under one
      // error were failing the same way, and every one of m122's eight snapshots carried the same
      // two blank-field alerts.
      const showed = tests
        .map((t) => showedBy.get(t.where))
        .find((items): items is readonly string[] => items !== undefined)
      causes.push({
        message,
        seconds: null,
        tests,
        evidence: group.evidence,
        // A duration group carries no block, so nothing says the transport failed: a cause with
        // no layer of its own is read as an assertion (unknown is never `connection`).
        kind: group.kind,
        ...(group.budgetMs === null ? {} : { budgetMs: group.budgetMs }),
        ...(showed === undefined ? {} : { pageShowed: [...showed] }),
      })
    }
  }
  // The failures with no body of their own — a `list` log with no error blocks in it, from a run
  // not started in the background — are grouped by how long they took: a band is opened by its
  // first test and takes the ones that
  // then ran the same length, the same band {@link repeatingFailure} uses.
  const listed = failedTests(text)
  named.push(...listed)
  const claimed = new Set(causes.flatMap((c) => c.tests.map(testKey)))
  // The causes above as a test can recognise itself: a retried failure's second row carries the
  // runner's `(retry #1)` marker, its failure block does not, and comparing the literal keys
  // read the same test as an unclaimed one (xr-molecule-flash-m155 +21:50).
  const proven = new Set(causes.flatMap((c) => c.tests.map(retrylessTestKey)))
  const unclaimed = distinctTests(listed).filter(
    (t): t is FailedTest & { seconds: number } =>
      t.seconds !== null &&
      !claimed.has(testKey(t)) &&
      // A flaky test's `✘` row is its first attempt; its `✓` retry follows it in the same log,
      // and the runner's tally already said the test passed.
      !flaky.has(testKey(t)) &&
      matchingExcludedTitles(t.title, excluded).length === 0,
  )
  const byDuration: Array<{ seconds: number; tests: FailedTest[] }> = []
  for (const t of unclaimed) {
    const band = Math.max(0.5, t.seconds * 0.05)
    const open = byDuration.find(
      (g) => Math.abs(g.seconds - t.seconds) <= Math.max(band, g.seconds * 0.05),
    )
    if (open) open.tests.push(t)
    else byDuration.push({ seconds: t.seconds, tests: [t] })
  }
  for (const g of byDuration) {
    // A duration band is a LEAD, not a cause: a test already carrying a proven cause above is
    // not named a second time here, and a band whose every member is one is not a cause at all —
    // it reads as one more thing to fix. m155's retry rows made six such bands.
    const tests = g.tests.filter((t) => !proven.has(retrylessTestKey(t)))
    if (tests.length === 0) continue
    causes.push({
      message: null,
      seconds: g.seconds,
      tests,
      evidence: [],
      kind: 'assertion',
    })
  }
  const ignored = distinctTests(named).filter(
    (t) => matchingExcludedTitles(t.title, excluded).length > 0,
  )
  return {
    causes: causes.sort((a, b) => b.tests.length - a.tests.length),
    ignored,
    flaky: flakyTests,
  }
}

/**
 * The error every test of a Playwright run reports when the run loaded no base URL: `page.goto('/')`
 * has nothing to resolve against, so the browser refuses the navigation before any page loads.
 * xr-molecule-flash-m113 (+20:34) got ten of these and a list that called them ten causes.
 */
const NO_BASE_URL_ERROR = /Cannot navigate to invalid URL/i

/** The browser's own `net::ERR_*`, as Playwright prints it for a document that never loaded. */
const NETWORK_ERROR_TEXT = /\bnet::ERR_[A-Z0-9_]+\b/

/**
 * Whether every cause this run grouped is a `page.goto` that ran out of time.
 *
 * @param causes - The run's grouped causes.
 * @returns True when the run measured no page at all.
 */
function everyCauseIsNavigationTimeout(causes: readonly FailureCause[]): boolean {
  return (
    causes.length > 0 &&
    causes.every(
      (cause) =>
        cause.message !== null &&
        (/\bpage\.goto\b/.test(cause.message) || /navigating to/.test(cause.message)) &&
        /timeout|timed out/i.test(cause.message),
    )
  )
}

/**
 * The one-line note for a run whose EVERY failure is {@link NO_BASE_URL_ERROR}: a configuration
 * failure, not a result about the app.
 *
 * A list of causes is the wrong shape here — there is one cause, and it is not in the app: the
 * command loaded no base URL. The line names the config the run should have loaded (the caller
 * passes the one the platform recorded for this suite) and hands over the exact narrowed command
 * with it, so the next run measures the app instead of spending another six minutes on the same
 * configuration mistake (xr-molecule-flash-m113 ran four such runs, 07:06:17 → 07:12:03).
 *
 * @param causes - The run's failures, all carrying the same error.
 * @param run - How the run was started, when the caller knows it.
 * @param excluded - The test titles the request carves out (inverted out of the re-run).
 * @returns The one-line sentence.
 */
function noBaseUrlConfigNote(
  causes: readonly FailureCause[],
  run:
    | { command: string; cwd?: string; config?: string | null; env?: readonly RunEnvSetting[] }
    | undefined,
  excluded: readonly string[],
): string {
  const total = causes.reduce((n, c) => n + c.tests.length, 0)
  const locations = [...new Set(causes.flatMap((c) => c.tests.map((t) => t.where)).filter(Boolean))]
  const config = run?.config ?? null
  // The command is only worth handing over WITH the config: the same command without it is the
  // run that just failed this way. Where the caller does not know the config, the line says what
  // to find instead of repeating the mistake.
  const rerun = run && config ? rerunOfRunningSuite(run, locations, excluded) : null
  const command = rerun ?? (run && config ? withSuiteConfig(run.command, config) : null)
  return (
    `Every one of these ${total} failures is the same configuration failure, not a result about ` +
    `the app: the run loaded no base URL, so every \`page.goto\` was refused with ` +
    `\`Cannot navigate to invalid URL\` before a page opened. Nothing here is a defect to fix. ` +
    (config
      ? `\`${config}\` is the config that sets \`use.baseURL\`, and the run before this one loaded ` +
        `it; this command left it out. `
      : 'The app’s own Playwright config (the one that sets `use.baseURL`) has to be passed ' +
        'with `--config`; this command names none. ') +
    (command ? `Send exactly this: \`${command}\`` : '')
  )
}

/** A landmark role a failed selector requires: `<nav>`/`role=navigation`, `<header>`/`role=banner`. */
export type RequiredLandmark = 'navigation' | 'banner'

/**
 * A selector that names the page's navigation landmark: the `nav` tag, a `navbar`/`nav-*` class,
 * or `role=navigation`. `a.navbar-brand` names it through its class — the brand link is the
 * navbar's own child in every theme this reader has seen.
 */
const NAVIGATION_SELECTOR =
  /(?:^|[\s>+~,(])nav(?=$|[\s.#:[>+~,)])|\.navbar(?:-[a-z-]+)?(?![\w-])|\[role\s*=\s*['"]?navigation['"]?\]/i

/** A selector that names the page's header landmark: the `header` tag or `role=banner`. */
const HEADER_SELECTOR = /(?:^|[\s>+~,(])header(?=$|[\s.#:[>+~,)])|\[role\s*=\s*['"]?banner['"]?\]/i

/**
 * The quoted argument of each `locator(...)` call in a failure block. Both quote styles are
 * matched separately: a selector routinely carries the OTHER quote inside it
 * (`locator('nav a[href="/"]')`), which one shared backreferenced class would cut short.
 */
const QUOTED_LOCATORS: readonly RegExp[] = [/locator\(\s*'([^']*)'/g, /locator\(\s*"([^"]*)"/g]

/** The role a `getByRole(...)` call names, when the role is a landmark this reader knows. */
const QUOTED_ROLE = /getByRole\(\s*(['"])(navigation|banner)\1/gi

/** The path an `[href="…"]` / `[to="…"]` filter names, when it is a root-relative route. */
const HREF_FILTER = /\[(?:href|to)\s*=\s*(['"])([^'"]+)\1\]/g

/**
 * The landmark a selector requires as an ANCESTOR (or names as its own role), or null when it
 * names no landmark at all (`h1`, `.article-preview`, `a[href="/profile/x"]`).
 *
 * @param selector - One CSS selector or `getByRole` role from a failure's call log.
 * @returns The landmark, or null.
 */
export function requiredLandmark(selector: string): RequiredLandmark | null {
  if (NAVIGATION_SELECTOR.test(selector)) return 'navigation'
  if (HEADER_SELECTOR.test(selector)) return 'banner'
  return null
}

/**
 * The route a selector names through an `[href="…"]`/`[to="…"]` filter (`nav a[href="/"]` → `/`),
 * or null when it names none. The query string and hash are dropped: the route is the path.
 *
 * @param selector - One CSS selector from a failure's call log.
 * @returns The path, or null.
 */
function routeNamedBySelector(selector: string): string | null {
  for (const match of selector.matchAll(HREF_FILTER)) {
    const value = match[2] ?? ''
    if (!value.startsWith('/') || value.startsWith('//')) continue
    const path = value.split(/[?#]/)[0] ?? value
    return path === '' ? '/' : path
  }
  return null
}

/** One failure that waits on an element only a navigation/header landmark can contain. */
interface MissingLandmarkFailure {
  /** The test's location as the log prints it. */
  where: string
  /** The landmark its selector requires. */
  landmark: RequiredLandmark
  /** The selectors that require it, as the call log wrote them. */
  selectors: string[]
  /** The route one of those selectors names (`/` from `nav a[href="/"]`), when any does. */
  route: string | null
}

/**
 * The failures whose own selector requires a landmark — the rows {@link missingHeaderNote}
 * compares against their page snapshots.
 *
 * @param text - The run's output, ANSI already stripped.
 * @returns The failures, in the order the run printed them.
 */
function missingLandmarkFailures(text: string): MissingLandmarkFailure[] {
  const out: MissingLandmarkFailure[] = []
  for (const block of failureBlocks(text)) {
    const header = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    const { where } = splitTitlePath(header?.[1] ?? '')
    const selectors: string[] = []
    // The block's own words, without the code frame: a `12 | await page.locator('header')` line
    // is the spec's SOURCE beside the failure, not the locator it waited for.
    const words = failureBody(block).join('\n')
    for (const pattern of QUOTED_LOCATORS)
      for (const match of words.matchAll(pattern)) selectors.push(match[1] as string)
    for (const match of words.matchAll(QUOTED_ROLE)) selectors.push(`[role="${match[2]}"]`)
    const distinct = [...new Set(selectors)]
    const needing = distinct.filter((selector) => requiredLandmark(selector) !== null)
    if (needing.length === 0) continue
    // Navigation outranks banner for a selector that names both (a `header nav …` chain): the
    // finding's own sentence is about the missing navigation.
    const landmark: RequiredLandmark = needing.some(
      (selector) => requiredLandmark(selector) === 'navigation',
    )
      ? 'navigation'
      : 'banner'
    const route = needing.map(routeNamedBySelector).find((candidate) => candidate !== null) ?? null
    out.push({ where, landmark, selectors: needing, route })
  }
  return out
}

/**
 * The snapshot a failure's own `error-context.md` produced, keyed the way the log and the
 * artifact both spell the test's location. The log writes the path relative to the command's
 * cwd and the artifact read keys it the same way, but a caller that shortened one side is
 * matched on its tail rather than losing the reading.
 *
 * @param where - The failure's location.
 * @param pageErrors - The snapshots the caller read.
 * @returns The entry, or undefined when this test has none.
 */
function pageSnapshotFor(
  where: string,
  pageErrors: readonly CausePageErrors[],
): CausePageErrors | undefined {
  const exact = pageErrors.find((entry) => entry.where === where)
  if (exact !== undefined) return exact
  return pageErrors.find(
    (entry) =>
      (where !== '' && entry.where.endsWith(`/${where}`)) ||
      (entry.where !== '' && where.endsWith(`/${entry.where}`)),
  )
}

/** How the sentence names the landmark: the finding's words, one per role. */
const LANDMARK_WORD: Record<RequiredLandmark, string> = {
  navigation: 'navigation',
  banner: 'header',
}

/**
 * The sentence for a run whose navigational elements are all missing from pages that otherwise
 * painted — the missing shared header the executor must check BEFORE rewriting auth.
 *
 * xr-molecule-flash-m193 (+13:54 → +20:00): four failures on `/` — `a[href="/profile/…"]`,
 * `a.navbar-brand`, `nav a[href="/"]`, `nav .user-pic` — while every `error-context.md` snapshot
 * showed the feed, sidebar and footer with no navigation at all. `Home.tsx` imported and
 * re-exported `Navbar` but never rendered it, and `App.tsx` mounted `<Home />` in a bare route.
 * The cause list named four unrelated symptoms, so the run rewrote `Navbar`'s auth logic and then
 * the HTTP bond across two whole walks (~6 minutes) instead of mounting the header.
 *
 * The reading is per FAILURE and per SNAPSHOT: each failure's own selector must require the
 * landmark, its own snapshot must have been read AND show populated page content, and that
 * snapshot must not contain the landmark. Two or more such failures on ONE route (the route a
 * selector names, e.g. `nav a[href="/"]` → `/`; failures whose selector names none ride along)
 * are the group. A page that shows the navigation and merely misses a signed-in link is not this
 * shape — its snapshots contain the landmark, so nothing is said.
 *
 * This never stops the run and never claims the page is blank: it is one sentence prepended to
 * the causes note ({@link failureCausesNote}).
 *
 * @param log - The run's output.
 * @param pageErrors - The page snapshot facts the caller read per failing test.
 * @returns The sentence, or null when the failures do not share a missing landmark.
 */
export function missingHeaderNote(
  log: string,
  pageErrors: readonly CausePageErrors[] = [],
): string | null {
  if (pageErrors.length === 0) return null
  const failures = missingLandmarkFailures(log.replace(ANSI_SGR, ''))
  for (const landmark of ['navigation', 'banner'] as const) {
    const needing = failures.filter((failure) => failure.landmark === landmark)
    if (needing.length < 2) continue
    // One route is what the sentence can name; two named routes are two pages, not one group.
    const routes = [...new Set(needing.map((failure) => failure.route).filter(Boolean))]
    if (routes.length !== 1) continue
    const route = routes[0] as string
    const group = needing.filter((failure) => failure.route === null || failure.route === route)
    if (group.length < 2) continue
    // Every snapshot in the group must have been READ, and each must show populated content
    // without the landmark. A snapshot that is missing, blank, or carries the landmark leaves
    // the reading unproven.
    const proven = group.every((failure) => {
      const snapshot = pageSnapshotFor(failure.where, pageErrors)
      if (snapshot === undefined || snapshot.landmarks === undefined) return false
      if (snapshot.populated !== true) return false
      return !snapshot.landmarks.includes(landmark)
    })
    if (!proven) continue
    const selectors = [...new Set(group.flatMap((failure) => failure.selectors))]
    const named = selectors.map((selector) => `\`${selector}\``)
    const list =
      named.length <= 1
        ? (named[0] ?? '')
        : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
    return (
      `The \`${route}\` snapshots contain populated main content but no ` +
      `${LANDMARK_WORD[landmark]} landmark. These ${list} failures share the missing header; ` +
      `check whether the route actually renders its shared header before changing authentication ` +
      `or the header component’s internals.`
    )
  }
  return null
}

/**
 * The one-line-per-cause summary of a finished run's failures, or null when the run named fewer
 * than two of them.
 *
 * This is what makes a run worth finishing: every cause the run found, in the result the
 * executor reads, so one round of fixes covers all of them rather than the one cause a run
 * stopped early happened to reach.
 *
 * A test the request excludes is not one of the causes — it is dropped and named once, at the
 * end, so a result never asks to fix a test it also says to ignore. A test the runner itself
 * declared `flaky` (it failed once and passed on its config retry) is not a cause either: it is
 * named apart from them, once, as what the tally called it ({@link flakyTestsDeclared}). Where
 * the caller knows how the run was started, the note also hands over the narrowed re-run of
 * exactly those tests ({@link rerunOfRunningSuite}) instead of leaving the executor to re-run the
 * whole suite.
 *
 * A run whose failures are ALL {@link NO_BASE_URL_ERROR} is not a set of causes at all: it is one
 * configuration failure, said in one line ({@link noBaseUrlConfigNote}) rather than a list that
 * reads as ten defects in the app.
 *
 * @param log - The finished run's output.
 * @param excluded - The test titles the request carves out, if the caller knows them.
 * @param run - How the run was started, when the caller knows it: the narrowed re-run is built
 *   from `command`/`cwd`/`config`/`env`, and `log` (the path the output was written to) is what
 *   the "left out" sentence greps when more causes exist than the result has room for.
 * @returns The note, or null.
 */
export function failureCausesNote(
  log: string,
  excluded: readonly string[] = [],
  run?: {
    command: string
    cwd?: string
    log?: string
    config?: string | null
    env?: readonly RunEnvSetting[]
  },
  pageErrors: readonly CausePageErrors[] = [],
  /**
   * Spec files whose selector-contract rows an edit broke since the last whole walk, when the
   * caller knows them: the narrowed re-run names them beside the failing tests. A green re-run of
   * the failure alone would certify a tree it never measured, and the specs selecting the
   * element the edit removed were never walked (xr-molecule-flash-m187 shipped that).
   */
  regressedSpecs: readonly string[] = [],
): string | null {
  const { causes, ignored, flaky } = groupFailures(log, excluded, pageErrors)
  const total = causes.reduce((n, c) => n + c.tests.length, 0)
  if (total < 2) return null
  // One cause that is not in the app: every failure is the browser refusing a navigation with no
  // base URL. The list shape is what m113 read as ten causes, so it is never printed for this.
  if (causes.every((c) => c.message !== null && NO_BASE_URL_ERROR.test(c.message)))
    return noBaseUrlConfigNote(causes, run, excluded)
  // The narrowed run, so the next fix round costs two tests instead of the whole suite
  // (xr-molecule-flash-m101 +12:13 re-ran all 139, ~4 minutes, to check two). The command is the
  // run's own invocation narrowed by the ONE composer the mid-run note also uses
  // ({@link rerunOfRunningSuite}), with the request's exclusions inverted out so the re-run
  // cannot report them again. The regressed specs ride the same set: a re-run of the failures
  // alone does not measure what an edit removed from the markup those specs select (m187).
  const locations = [
    ...new Set([
      ...causes.flatMap((c) => c.tests.map((t) => t.where)).filter(Boolean),
      ...regressedSpecs,
    ]),
  ]
  const rerun = run ? rerunOfRunningSuite(run, locations, excluded) : null
  // A document the browser could not load explains every failure at once, and it is not in the
  // app: m118 (+37:09) read 14 `page.goto` timeouts as app failures while the page load had ended
  // `net::ERR_CONTENT_DECODING_FAILED`. The cause list is the wrong shape here — there is one
  // cause and it is the server — so the note leads with the browser's own line, not a fix round.
  const networkError = NETWORK_ERROR_TEXT.exec(log)?.[0]
  if (networkError !== undefined && everyCauseIsNavigationTimeout(causes)) {
    return (
      `${total} failure${total === 1 ? '' : 's'} in this run, and every one is a \`page.goto\` ` +
      `that never loaded while the browser reported \`${networkError}\` — the document request ` +
      `itself failed, so none of these is the app’s code or a selector. Fix the server first` +
      (networkError === 'net::ERR_CONTENT_DECODING_FAILED'
        ? ': a body whose gzip `content-encoding` no longer matches its bytes does this, and a ' +
          '`vite preview` over a build must be started with ' +
          '`MOL_E2E_PREVIEW_PLUGIN=0 npx vite preview --host 127.0.0.1 --port 4173 --strictPort`'
        : ' (what the run hit, and why it refused the connection)') +
      (rerun ? `. Then send exactly this: \`${rerun}\`` : '') +
      (locations.length > 0 ? `. Failing tests: ${locations.join(', ')}.` : '')
    )
  }
  const ignoredTitles = [...new Set(ignored.map((t) => t.title || t.where).filter(Boolean))]
  const flakyTitles = [...new Set(flaky.map((t) => t.where || t.title).filter(Boolean))]
  // A cause that never reached the app is not a cause the app's code can fix: the transport
  // failed, so the one action is a re-run (xr-molecule-flash-m110 +18:42 — a 20 s connection
  // timeout was read as an assertion and answered with a CORS middleware). Every cause being one
  // is its own sentence: nothing the app produced was measured, so there is no fix round at all.
  const connections = causes.filter((cause) => cause.kind === 'connection')
  if (causes.length > 0 && connections.length === causes.length) {
    const at = [...new Set(connections.flatMap((c) => c.tests.map((t) => t.where)).filter(Boolean))]
    return (
      `${total} failure${total === 1 ? '' : 's'} in this run, and every one is a CONNECTION error — ` +
      `the requests never reached the app, so nothing here is an app-code cause${at.length ? `: ${at.join(', ')}` : ''}. ` +
      `Send the same file${at.length === 1 ? '' : 's'} once more as ${at.length === 1 ? 'it is' : 'they are'}; ` +
      "if the failure repeats, read the app's own log (`read_logs`) — a connection error is never a " +
      'handler shape, a header or CORS.'
    )
  }
  // A text that is the TAIL of a longer log says so in its first line (`…(N earlier characters
  // omitted)`, the shape `background-tasks` writes when a log is capped): what it holds is not
  // the run's list of failures, only the part that survived the cut. Saying "N failures in this
  // run" over it reads as complete, and did: xr-molecule-flash-m123's collected 42 KB diagnosis
  // log was clipped to its last 8 KB, and this note grouped 2 of the run's 14 failures under
  // "fix every cause below" while the 11 that shared the run's one real cause were gone
  // (2026-10-17). The root fix is to hand this function the whole log; this says so when a
  // caller cannot.
  const clipped = /^…\((\d+) earlier characters omitted\)/.exec(log)
  // The missing-header reading leads the list: four unrelated locators failing while every
  // snapshot shows the page painted and un-navigated is ONE fact about the route, and the list
  // below would otherwise read as four separate defects (xr-molecule-flash-m193 rewrote the
  // navbar's auth logic and then the HTTP bond across two walks, ~6 minutes, for a page that
  // never rendered `<Navbar />`).
  const missingHeader = missingHeaderNote(log, pageErrors)
  const header =
    (missingHeader === null ? '' : `${missingHeader}\n`) +
    (clipped !== null
      ? `${total} failure${total === 1 ? '' : 's'} in the LAST part of this run’s log — its ` +
        `first ${clipped[1]} characters were clipped, so a cause that failed earlier is ` +
        `missing here. Fix every cause below${connections.length > 0 ? ' the app’s code can produce, and re-send the connection error once as it is' : ''}, ` +
        `and read the whole run log before concluding:\n`
      : `${total} failure${total === 1 ? '' : 's'} in this run, grouped by cause — fix every cause ` +
        `below${connections.length > 0 ? ' the app’s code can produce, and re-send the connection error once as it is' : ' before the next deploy'}:\n`)
  // The flaky sentence sits before the ignored one: the ignored sentence is the LAST thing the
  // note says, and callers assert on that ending.
  const tail =
    (rerun ? ` Re-run just these once they are fixed: \`${rerun}\`` : '') +
    (flakyTitles.length
      ? ' Flaky (failed once, passed on the config retry — the runner counts these as flaky, not ' +
        `as failures): ${flakyTitles.join(', ')}.`
      : '') +
    (ignoredTitles.length
      ? ` Ignored (excluded by the request): ${ignoredTitles.join(', ')}.`
      : '') +
    (connections.length > 0
      ? ` The connection error is not app code: send that file once more as it is, and if it repeats, ` +
        "read the app's own log (`read_logs`) — it never reached the app."
      : '')
  // This list is the part of the result that SURVIVES the platform's tool-output cut: the stdout
  // above it is cut in the MIDDLE at {@link TOOL_RESULT_CHARS}, which is why the recap must fit
  // whole ({@link FAILURE_CAUSES_CHARS}) instead of being capped at a line count that left 3 of
  // xr-molecule-flash-m102's 8 causes out of a result that had room for them (+12:43).
  const room = Math.min(
    FAILURE_CAUSES_CHARS,
    TOOL_RESULT_CHARS - header.length - tail.length - FAILURE_CAUSES_OMITTED_CHARS,
  )
  const lines: string[] = []
  let used = 0
  for (const cause of causes) {
    if (lines.length >= FAILURE_CAUSES_LISTED) break
    const line = failureCauseLine(cause, lines.length)
    if (lines.length > 0 && used + line.length + 1 > room) break
    lines.push(line)
    used += line.length + 1
  }
  return `${header}${lines.join('\n')}${omittedCausesRecap(causes.slice(lines.length), run, excluded)}${tail}`
}

/**
 * One cause's line in a finished run's recap: its signature, the tests it hit, and the first
 * failure's two most useful body lines underneath.
 *
 * The path is the one the log itself wrote, never a shortened one: it is relative to the
 * command's own cwd, so it is the form the executor can paste back (X1 flash-m82 read a shortened
 * `e2e/auth.spec.ts:19` as the suite's own stale starter spec, rewrote its Playwright config over
 * it and deleted the app's tests — 4 minutes of a 60-minute run on a working config).
 *
 * @param cause - The cause to write.
 * @param index - Its position in the recap (0-based; printed 1-based).
 * @returns The line, with its body line when it has one.
 */
function failureCauseLine(cause: FailureCause, index: number): string {
  const tests = cause.tests.slice(0, FAILURE_CAUSE_TESTS_LISTED).map((t) => t.where || t.title)
  const more =
    cause.tests.length > tests.length ? `, … and ${cause.tests.length - tests.length} more` : ''
  const signature =
    cause.message !== null
      ? `\`${cause.budgetMs === undefined ? cause.message : signatureWithBudget(cause.message, cause.budgetMs)}\``
      : `each after ~${cause.seconds}s (a shared duration, not a proven cause)`
  const files = new Set(cause.tests.map((t) => specFile(t.where)).filter(Boolean)).size
  // A line the signature already carries (a timeout's `waiting for` locator, say) is not printed
  // twice; the rest are the values the normalised signature replaced with `<n>`.
  const body = cause.evidence.filter(
    (line) => cause.message === null || !cause.message.includes(line),
  )
  const shortened = body.map((line) =>
    line.length > FAILURE_EVIDENCE_CHARS ? `${line.slice(0, FAILURE_EVIDENCE_CHARS - 1)}…` : line,
  )
  // The page's own words at the failure (xr-molecule-flash-m122 +23:39): the error line names the
  // symptom, and these name what the app was saying while it happened. The parenthetical is said
  // only for the shape the items themselves show — validation copy on a form — where "submitted
  // before its values loaded" is the reading, and never for arbitrary page text.
  const showed = cause.pageShowed?.length
    ? `\n     the page showed: ${cause.pageShowed.map((t) => `\`${t}\``).join(', ')}` +
      (cause.pageShowed.some((t) => /\b(?:blank|required|invalid|must be)\b/i.test(t))
        ? ' (the action ran before the form’s values had loaded)'
        : '')
    : ''
  return (
    `  ${index + 1}. ${cause.kind === 'connection' ? 'CONNECTION error, not the app’s — ' : ''}${signature} — ` +
    `${cause.tests.length} test${cause.tests.length === 1 ? '' : 's'} ` +
    `in ${files} file${files === 1 ? '' : 's'}: ${tests.join(', ')}${more}` +
    (shortened.length ? `\n     ${shortened.join(' · ')}` : '') +
    showed
  )
}

/**
 * The sentence for the causes a recap could not fit: exactly which `file:line` each one was
 * found at, and the ONE command that prints their bodies.
 *
 * Without it the old note said "… and 3 more causes" and left the executor to find them in a
 * stdout whose middle the tool-result cut had already removed — xr-molecule-flash-m102 (+12:43)
 * spent four `grep -A` round trips (~25 s) naming three causes the platform had withheld, and a
 * weaker turn reads the listed ones and skips the rest.
 *
 * @param omitted - The causes past the recap's budget.
 * @param run - How the run was started, and where its log is, when the caller knows.
 * @param excluded - The test titles the request carves out (the fallback re-run inverts them out).
 * @returns The sentence, or '' when nothing was omitted.
 */
function omittedCausesRecap(
  omitted: FailureCause[],
  run:
    | {
        command: string
        cwd?: string
        log?: string
        config?: string | null
        env?: readonly RunEnvSetting[]
      }
    | undefined,
  excluded: readonly string[],
): string {
  if (omitted.length === 0) return ''
  const all = omitted
    .map((c) => c.tests[0]?.where || c.tests[0]?.title)
    .filter((l): l is string => Boolean(l))
  // The one command: a grep of the run's own log when the caller knows its path (the bodies are
  // still there, whole), else a narrowed re-run of exactly these tests, which prints them.
  const print = (named: string[]): string => {
    if (run?.log && named.length > 0)
      return (
        ` Print them: \`grep -n -A 40 ` +
        `${named.map((l) => `-e ${shellQuote(l)}`).join(' ')} ${shellQuote(run.log)}\`.`
      )
    const rerun = run ? rerunOfRunningSuite(run, named, excluded) : null
    if (rerun) return ` Print them by re-running just these: \`${rerun}\`.`
    if (named.length === 0) return ''
    return ` Print one with \`grep -n -A 40 -e ${shellQuote(named[0])} <the run's log>\`.`
  }
  let keep = all.length
  for (;;) {
    const named = all.slice(0, keep)
    const dropped = all.length - keep
    const sentence =
      `\n  … and ${omitted.length} more cause${omitted.length === 1 ? '' : 's'}` +
      (named.length
        ? `: ${named.join(', ')}${dropped > 0 ? ` (+${dropped} more, also in the log)` : ''}`
        : '') +
      ` — their bodies are past the part of this result the cut keeps.` +
      print(named)
    if (sentence.length <= FAILURE_CAUSES_OMITTED_CHARS || keep <= 1) return sentence
    keep = Math.max(1, Math.floor(keep / 2))
  }
}

/**
 * The command that re-runs the tests at `locations` the way the run IN FLIGHT ran them: the same
 * invocation, in the same directory, narrowed to those tests — or null when the running command
 * is not a Playwright run this can narrow.
 *
 * The `locations` are the paths the run's own log printed, which are relative to the directory
 * that run started in, so the composer resolves them there ({@link scopedRerunCommand}): the
 * command names that directory unless it already changes into one of its own, because the
 * executor's next command starts wherever it starts. The returned command is for AFTER the run
 * ends — it is a second run against the same app and database, and that is exactly what is
 * refused while the run walks ({@link suiteRunInTheWay}).
 *
 * @param run - The run in flight: the command it was started with, as it was run, the directory
 *   that command ran in, the config it loaded when the caller knows it, and the settings the
 *   request required and the run left out (`env`) — the re-run carries them, so it never
 *   reproduces the configuration the run was measured under by mistake (m182).
 * @param locations - The failing `file:line`s to re-run, as the run's log printed them.
 * @param excluded - The test titles the request carves out: the re-run inverts them out
 *   (`--grep-invert`) so it cannot report them again.
 * @returns The re-run command, or null when there is no suite to narrow.
 */
export function rerunOfRunningSuite(
  run: { command: string; cwd?: string; config?: string | null; env?: readonly RunEnvSetting[] },
  locations: readonly string[],
  excluded: readonly string[] = [],
): string | null {
  if (locations.length === 0) return null
  // The run's own directory is the base a relative failure location resolves against: the
  // reporter prints it from where the runner started, and Playwright matches file arguments
  // against absolute paths (xr-molecule-flash-m118 +16:34, m124 +18:38).
  const scoped = scopedRerunCommand(
    run.command,
    locations,
    excluded,
    run.config,
    run.cwd,
    run.env ?? [],
  )
  if (scoped === run.command) return null
  if (!run.cwd || commandSegments(withoutHeredocs(run.command)).some((s) => s.program === 'cd'))
    return scoped
  return `cd ${shellQuote(run.cwd)} && ${scoped}`
}

/**
 * The sentence that names a cause repeating among a running suite's failures, mid-run.
 *
 * Kept here, beside {@link repeatingFailure}, so the two stay in step: every word below is about
 * what that function could actually see in the log — including the count, which is of DISTINCT
 * tests, so the note never names one or two tests as a cause.
 *
 * The note names the cause early so the executor can START FIXING while the run keeps walking,
 * and it hands a stop command over only when {@link earlyReturnCause} says so — the SAME
 * predicate the wait uses to decide whether to return early, so a finding the wait keeps waiting
 * on is a finding this note never asks to stop for. X1 flash-m76 (2026-10-16) spent 4.0 minutes
 * walking 15 tests whose one cause was certain at the third, 47 s in, and the note answers
 * exactly that; X1 flash-m83 then stopped eight runs at their first repeating cause in 14.5
 * minutes and never finished one, so the note must not say to stop when the run still has other
 * causes to name. X1 xr-molecule-flash-m99 (2026-10-16) is the third shape: a shared duration is
 * not a cause at all, so a lead reaches the executor as a note on a result it is still waiting
 * for — never as a verdict with a stop command in it.
 *
 * The run is STILL WALKING while this note is written — both callers produce it mid-run — so a
 * re-run of one of its tests is a second run against the same app and database, and the platform
 * refuses that ({@link suiteRunInTheWay}, the same rule its overlap hold answers with):
 * xr-molecule-flash-m89 (2026-10-16) read *"Start on them now, while the run keeps walking.
 * `null-fields.spec.ts:53` alone reproduces the first one."* and sent exactly that re-run 23 s
 * later, where the hold answered *"A playwright suite is already running against this app and
 * database … Wait for it."* The note therefore hands over the read-and-fix to do NOW and the
 * re-run for after the run ends — the exact command where the caller knows how the run was
 * started ({@link rerunOfRunningSuite}), the timing alone where it does not.
 *
 * @param found - What {@link repeatingFailure} found.
 * @param o - The run's facts: its `taskId`, its `log` path, `stop` — the shell command that
 *   stops it, printed only for an {@link earlyReturnCause} — `universal`, what
 *   {@link universalCause} found (absent means the run is not failing whole), `run`, how the
 *   run was started ({@link rerunOfRunningSuite}) when the caller knows it, and
 *   `editsInvalidateRun`, true when the run measures the sandbox's own app (a local run, where an
 *   edit now changes what the suite is testing and its result stops counting).
 * @returns The note.
 */
export function repeatingFailureNote(
  found: RepeatingFailure,
  o: {
    taskId: string
    log: string
    stop: string
    universal?: UniversalCause | null
    run?: { command: string; cwd?: string; env?: readonly RunEnvSetting[] }
    editsInvalidateRun?: boolean
  },
): string {
  const listed = found.tests.slice(0, REPEATING_FAILURE_LISTED)
  // Every row names its test by the SAME path the re-run hint below uses (`shortWhere`
  // would print this one file under two names: X1 flash-m82 read `✘ e2e/auth.spec.ts:19`
  // here against `Re-run fixtures/realworld/specs/e2e/auth.spec.ts:19 alone` three lines
  // down, took the suite-relative form for "the project's own stale starter spec" and
  // rewrote its Playwright config over it, deleted the app's tests and wrote its own —
  // 4 minutes of a 60-minute run, on a run whose config was right). The path the log
  // wrote is relative to the command's own cwd, so it is the one the executor can paste
  // back into a command.
  const rows = listed
    .map(
      (t) =>
        `  ✘ ${[t.where, t.title].filter(Boolean).join(' › ')}` +
        (t.seconds === null ? '' : ` (${t.seconds}s)`),
    )
    .join('\n')
  const more = found.count > listed.length ? `\n  … and ${found.count - listed.length} more` : ''
  // Two signatures, and only ONE of them is a cause. An error repeating verbatim is the cause
  // itself; a duration repeating is what a suite's own `actionTimeout` does to every failure that
  // waits for anything, so the note must not call it one cause (X1 flash-m84, 2026-10-16: four
  // failures at 6.8-7.4 s, four different missing elements, and this sentence told the executor
  // "one cause is repeating").
  const isCause = found.message !== null
  const signature = isCause
    ? `every one with \`${found.message}\``
    : `each after ~${found.seconds}s — the same duration to within half a second`
  const first = found.tests[0]
  const firstAt = first?.where ?? ''
  // The re-run this note names, and whether a run is in its way — the SAME rule the platform's
  // overlap hold answers with (@link suiteRunInTheWay), asked of the same pair: the app the
  // composed re-run would measure, and the app the run in flight measures (both read off the two
  // commands, so a re-run aimed anywhere else is not refused).
  const rerun = firstAt && o.run ? rerunOfRunningSuite(o.run, [firstAt]) : null
  const measured = o.run ? suiteCommandTarget(o.run.command) : null
  const inTheWay =
    measured === null
      ? null
      : suiteRunInTheWay({ target: rerun ? suiteCommandTarget(rerun) : measured }, [
          // The composer only narrows a `playwright test` run, and the sentence below says the run
          // is still walking, so the run in flight is a suite either way.
          { runsSuite: true, target: measured },
        ])
  // Where the run's own app is not known (this process did not start it — a restart between the
  // launch and the wait), the note still knows the run is WALKING, which is the whole of the
  // reason the re-run waits: nothing may start against the app it walks.
  const aRunIsInTheWay = measured === null || inTheWay !== null
  const reproduce = firstAt
    ? ` Read \`${firstAt}\` and the code it drives now, and fix it: nothing may run against this ` +
      `app while the run walks — a second run against the same app and database is refused — so ` +
      `run it alone once the run has ended.`
    : ''
  // Where the note knows how the run was started, it also hands over the exact command for after
  // it: the whole-suite command it must not send again, narrowed to the failing test, in the
  // directory the run started in. Without that record it says the timing and nothing more.
  const thenRun = aRunIsInTheWay && rerun ? `\nSend this once the run ends:\n  ${rerun}` : ''
  const where = `task ${o.taskId}, log ${o.log}`
  // The ONE predicate behind this wording and the wait's own early return (`earlyReturnCause`), so
  // a finding the wait keeps waiting on can never be handed a stop command here.
  const stop = earlyReturnCause(found, o.universal)
  if (stop) {
    const files = stop.files.map(shortFile)
    const shown = files.slice(0, 4).join(', ')
    const moreFiles = files.length > 4 ? `, … and ${files.length - 4} more` : ''
    const span =
      files.length === 0
        ? ''
        : ` — across ${files.length} file${files.length === 1 ? '' : 's'} (${shown}${moreFiles})`
    // The page renders NOTHING: the failures do not share an error signature — each spec is
    // waiting for its own first element — so naming one locator as "the way they failed" would be
    // wrong. The cause is the page, and the page's own error (when the run printed one) is what
    // names it (xr-molecule-flash-m141).
    if (stop.pageRendersNothing) {
      const pageTests = (stop.tests ?? found.tests).slice(0, REPEATING_FAILURE_LISTED)
      const pageRows = pageTests
        .map(
          (t) =>
            `  ✘ ${[t.where, t.title].filter(Boolean).join(' › ')}` +
            (t.seconds === null ? '' : ` (${t.seconds}s)`),
        )
        .join('\n')
      const moreFailures =
        stop.count > pageTests.length ? `\n  … and ${stop.count - pageTests.length} more` : ''
      const pageError = stop.pageError ? ` The page itself threw: \`${stop.pageError}\`.` : ''
      return (
        `Every test this run has walked so far has failed at its first locator — all ` +
        `${stop.count} of them${span}, with nothing passing since the first:\n` +
        `${pageRows}${moreFailures}\n` +
        `Each is waiting for an element the page never painted, so one cause explains all of ` +
        `them: the app is rendering NOTHING — its bundle throws while it loads, or it never ` +
        `mounts.${pageError} Every remaining test will fail the same way too, so walking the ` +
        `rest of this run only repeats this one cause. Stop it and fix that cause first: ` +
        `\`exec_command: ${o.stop}\`, then run the whole suite again. It is still going (${where}).` +
        `${reproduce}`
      )
    }
    return (
      `Every test this run has walked so far has failed the same way — all ${found.count} of ` +
      `them, ${signature}${span}, with nothing ` +
      `passing since the first:\n${rows}${more}\n` +
      `Every remaining test will fail the same way too, so walking the rest of this run only ` +
      `repeats this one cause. Stop it and fix that cause first: \`exec_command: ${o.stop}\`, ` +
      `then run the whole suite again. It is still going (${where}).${reproduce}`
    )
  }
  // Everything else is a note on a run the wait is still waiting for, and both its shapes end the
  // same way: the run finishes, because it is the only thing that names the causes this finding is
  // not. What it does NOT carry is the "Stop it if every test fails this way" clause — that one
  // belongs to a PROVEN cause the run is still walking (the sentence below), never to a lead:
  // xr-molecule-flash-m99's executor read it on a shared duration and voided the run.
  const keepGoing =
    `Let the rest of the run finish — it is the only thing that will name the causes that are NOT ` +
    `this one, and a run stopped at its first repeating cause costs a second whole run to find ` +
    `them. It is still going (${where}).`
  if (isCause)
    return (
      `${found.count} different tests in this run have already failed the same way — ${signature} — ` +
      `so one cause is repeating:\n${rows}${more}\n` +
      (o.editsInvalidateRun
        ? `Work out the fix now: apply it when the run ends, not while it walks. Stop it only if every test it walks `
        : `Start fixing it now, while the run keeps walking. Stop it only if every test it walks `) +
      `fails this same way (the app unreachable, a 5xx on every request, the same selector timing ` +
      `out on every test of every file so far).${reproduce} ${keepGoing}${thenRun}`
    )
  return (
    `${found.count} different tests in this run each failed after ~${found.seconds}s — the same ` +
    `duration to within half a second. A shared duration is a lead, not a cause: a suite whose ` +
    `config sets a timeout spends that timeout on every failure that waits for anything, so ` +
    `different missing elements land on the same number. Read these failures before fixing one ` +
    `of them:\n${rows}${more}\n` +
    (o.editsInvalidateRun
      ? `Work out the fixes now: apply them when the run ends, not while it walks.`
      : `Start on them now, while the run keeps walking.`) +
    `${reproduce} ${keepGoing}${thenRun}`
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
  // On failure print `line:column: message`, the offending source line and a
  // caret: esbuild's own message names only `<stdin>:7:44`, which left agents
  // re-emitting whole files or running scripts just to see the character
  // (X1 runs sol-m05, sol-m06).
  return (
    `node -e "const p=process.argv[1];const src=require('fs').readFileSync(p,'utf8');` +
    `try{require('esbuild').transformSync(src,{loader:p.endsWith('x')?'tsx':'ts',logLevel:'silent'})}` +
    `catch(e){const m=(e.errors||[])[0];if(!m||!m.location)throw e;const l=m.location;` +
    `console.error(l.line+':'+(l.column+1)+': '+m.text+String.fromCharCode(10)+l.lineText.slice(0,240)+String.fromCharCode(10)+' '.repeat(Math.min(l.column,240))+'^');process.exit(1)}" ${q}`
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

/**
 * The line a replacement fused when it dropped the newline its `old_string`
 * ended with: `new_string`'s text is followed on the same line by what used to
 * be the next line. Read off the file as it now is, so the line shown is the
 * line the parser is actually complaining about.
 *
 * @param content - The file's content after the edit.
 * @param newString - A replacement's `new_string`, whose `old_string` ended with a newline.
 * @returns The fused line's 1-based number and its text, or null when the
 *   replacement's text is not followed by more of the same line (it ends the
 *   file, the following newline survived, or another replacement rewrote it).
 */
export function fusedLine(
  content: string,
  newString: string,
): { line: number; text: string } | null {
  for (let at = content.indexOf(newString); at >= 0; at = content.indexOf(newString, at + 1)) {
    const endsAt = at + newString.length
    const next = content[endsAt]
    // End of file (nothing was joined) or a newline (the boundary survived) are
    // both "not fused". A later replacement in the same batch may have rewritten
    // this text, so keep looking rather than giving up on the first occurrence.
    if (next === undefined || next === '\n') continue
    const lineStart = content.lastIndexOf('\n', at) + 1
    const lineEnd = content.indexOf('\n', endsAt)
    return {
      line: content.slice(0, lineStart).split('\n').length,
      text: content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd),
    }
  }
  return null
}
