/**
 * Shared utilities for AI agent tools.
 * Extracted from molecule-dev/api/src/ai/tools.ts for reuse.
 *
 * @module
 */

import { posix } from 'path'

import { commandSegments } from './command-position.js'
import { commandRunsNoTests } from './no-test-run.js'

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
 * Whether a shell command only PRINTS source files (`cat a.tsx`, `sed -n '1,40p' x.ts`,
 * `head -50 b.hurl`): its output is file content and gets the code-safe redaction, like
 * read_file. Through the env-dump grade a printed `type AuthState = 'authenticated' | …`
 * came back as `'[REDACTED]'`, and the executor wrote the mask into a new file (X1
 * flash-m58). Any segment that is not such a print, or any env file named, keeps the full grade.
 *
 * @param command - The shell command.
 * @returns True when every segment prints source files only.
 */
export function printsOnlySource(command: string): boolean {
  if (/\.env\b/.test(command)) return false
  const segments = command
    .split(/\s*(?:&&|;|\n)\s*/)
    .map((s) => s.trim())
    .filter((s) => s && !/^cd\s/.test(s))
  if (segments.length === 0) return false
  return segments.every((seg) => {
    // Words, quotes kept whole: a grep pattern like "sign\\|verify" is one word, not a pipe.
    const words = seg.match(/"(?:\\.|[^"\\])*"|'[^']*'|\S+/g) ?? []
    const stages: string[][] = [[]]
    for (const w of words) {
      if (w === '|') stages.push([])
      else if (!/^\d?>&\d$|^2>\/dev\/null$/.test(w)) stages[stages.length - 1].push(w)
    }
    const [first, ...rest] = stages
    const head = first[0]
    // A print of named source files: cat/head/tail/nl/sed -n, or a non-recursive grep/rg
    // (X1 flash-m61 read a fixture's password masked through `grep -n … auth.hurl`).
    let args = first.slice(1)
    if (head === 'sed' && args[0] !== '-n') return false
    if (head === 'grep' || head === 'rg') {
      if (args.some((a) => /^-[a-zA-Z]*[rR]/.test(a) || a === '--recursive')) return false
      const flags = args.filter((a) => a.startsWith('-'))
      const rest2 = args.filter((a) => !a.startsWith('-'))
      args = flags.includes('-e') ? rest2 : rest2.slice(1)
    } else if (!/^(?:cat|head|tail|nl|sed)$/.test(head ?? '')) return false
    const files = args.filter(
      (t) => !t.startsWith('-') && !/^'[^']*'$|^"[^"]*"$|^\d+$|^\d+,\d+p$/.test(t),
    )
    if (files.length === 0 || !files.every((f) => SOURCE_FILE_RE.test(f))) return false
    // After it, only text filters that read no file of their own.
    return rest.every(
      (stage) =>
        /^(?:head|tail|sort|uniq|wc|cut|nl|grep)$/.test(stage[0] ?? '') &&
        !stage.slice(1).some((a) => !a.startsWith('-') && /\.[a-z]+$/i.test(a) && !/^['"]/.test(a)),
    )
  })
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
 * @param command - The shell command.
 * @returns The target as written, or null (`/dev/null` and `&1`/`&2` are not files).
 */
export function outputRedirectTarget(command: string): string | null {
  // A heredoc that writes a file (`cat > cfg.ts <<'EOF' … EOF`) is not where the run's output
  // goes: X1 flash-m44 was told its config file was the suite's log.
  const text = command.replace(/[^\n;&|]*<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g, '')
  const tee = /\|\s*tee\s+(?:-a\s+)?([^\s;&|]+)/.exec(text)
  if (tee) return tee[1]
  let last: string | null = null
  for (const m of text.matchAll(/(?:^|[^0-9&>])(?:&>|1?>>?)\s*([^\s;&|]+)/g)) {
    if (m[1] !== '/dev/null' && !m[1].startsWith('&')) last = m[1]
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
 * Rewrite a command about to run in the background so its log grows while it
 * runs. Two shapes left the log empty until exit, and an empty log is what
 * `wait_for_task` reads as "stuck", so working suites were reported stuck and
 * killed (X1 run flash-m15 lost 20 of its 60 minutes this way, 2026-10-15):
 *
 * - a trailing `| tail -N`, which holds everything back until the command ends.
 *   It is dropped: `wait_for_task` already returns the end of the log.
 * - `playwright test` with no `--reporter`, which runs the config's reporter —
 *   often `html`, which prints nothing per test. `--reporter=list` is added
 *   when the playwright run is the command's last step and nothing is piped or
 *   redirected from it: it writes each result as it finishes, and it is the
 *   shape the platform reads a background suite back in.
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
 * Only the command's last step is touched, and only its reporter, and only when that step runs
 * something: `npx playwright test --list` takes two seconds and writes nothing per test, so
 * neither reporter nor `--retries=0` is added to it ({@link isPlaywrightRunCommand}).
 *
 * @param command - The command as the executor sent it.
 * @returns The command to run and one sentence per change made (empty when none).
 */
export function streamingBackgroundCommand(command: string): {
  command: string
  changes: string[]
} {
  // A command that runs no test is not a run to keep a growing log for: nothing about it is
  // rewritten (flash-m79's `--list` was read as a whole-suite run end to end, and got a ~4 KB
  // refusal to send itself again with `--max-failures=15`).
  if (commandRunsNoTests(command)) return { command, changes: [] }
  const changes: string[] = []
  let out = command
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
  const lastStep = out.split(/&&|\|\||;/).at(-1) ?? ''
  const finalPlaywrightRun =
    isPlaywrightRunCommand(lastStep) &&
    // `2>&1` only joins stderr to the log; any other pipe or redirect sends the output elsewhere.
    !/[|>]/.test(lastStep.replace(/\d?>&\d/g, ''))
  // A diagnosis or a re-run (capped, last-failed, grepped, or named files) walks each failure
  // once: the suite's own `retries` doubled every failure of X1 flash-m71's first whole run,
  // which had dropped the `--retries=0` it used one command earlier. The uncapped proof run
  // keeps the suite's retries.
  const iterating =
    /--max-failures\b|--last-failed\b|(?:^|\s)(?:-g|--grep)\b|\S+\.(?:spec|test)\.[cm]?[jt]sx?(?::\d+)?\b/.test(
      lastStep,
    )
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
      // Only the last step is rewritten, and `lastStep` is a suffix of `out`.
      out =
        out.slice(0, out.length - lastStep.length) +
        lastStep.slice(0, reporters.start) +
        `--reporter${reporters.separator}${kept.join(',')}` +
        lastStep.slice(reporters.end)
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
  } else if (finalPlaywrightRun) {
    out = `${out.trimEnd()} --reporter=list`
    changes.push(
      'Added `--reporter=list` so each test result is written to the log as it finishes ' +
        '(the config reporter may print nothing until the end).',
    )
  }
  if (finalPlaywrightRun && iterating && !/--retries\b/.test(lastStep)) {
    out = `${out.trimEnd()} --retries=0`
    changes.push(
      'Added `--retries=0`: a diagnosis or re-run walks each failure once; keep the suite’s retries for the proof run.',
    )
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
]

/**
 * Whether a command runs a whole test suite — a Playwright, Vitest or Hurl run
 * — rather than a build, an install or a one-off script.
 *
 * A command that invokes a runner only to print is not one of these
 * ({@link commandRunsNoTests}): `npx playwright test --list` prints the tests it would run and
 * exits, and `npx playwright install`, `vitest list` and `hurl --help` start no test either.
 *
 * @param command - The shell command.
 * @returns True when the command starts one of those runners.
 */
export function isSuiteRunCommand(command: string): boolean {
  if (commandRunsNoTests(command)) return false
  return commandSegments(command).some((segment) =>
    SUITE_RUN_COMMANDS.some((re) => re.test(segment.text)),
  )
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
  const paths = pathPatternVariants(pattern).map((p) => `-path ${shellQuote(`*/${p}`)}`)
  return paths.length === 1 ? paths[0] : `\\( ${paths.join(' -o ')} \\)`
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
 * A Playwright `list` run prints one line per test as it finishes and its error blocks only at
 * the end, so the LAST bytes of a running log are its least informative part — in X1 flash-m61
 * the last 3 000 bytes of a 139-test walk were the skip list, and all 61 failures were above
 * them, which cost the run the grep it had to make anyway.
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
 * @param block - One block from {@link failureBlocks}.
 * @returns The error line, or null when the block has no body.
 */
function failureMessage(block: string): string | null {
  const body = block
    .split('\n')
    .slice(1)
    .map((l) => l.replace(ANSI_SGR, '').trim())
    // Progress lines the `list` reporter interleaves with the `line` reporter's blocks are not
    // the block's own words, and a code frame or an `at …` line is where the error happened, not
    // what it said.
    .filter(
      (l) =>
        l &&
        !LIST_RESULT_LINE.test(l) &&
        !/^(?:at\s|\d+ \||>\s*\d+ \||\|)/.test(l) &&
        !/^Error Context:/.test(l),
    )
  const thrown = body.find((l) => /^[A-Za-z_$][\w.$]*(?:Error|Exception)\b/.test(l))
  return thrown ?? body[0] ?? null
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
 * path and how long it ran — and defers each failure's error to the summary at the end, so
 * mid-run the only signature those lines carry is the duration. Where the log carries the
 * failure bodies (a `line` reporter's output, or a finished run's summary) the repeated error
 * message itself is the signature, which is stronger (it needs no assumption about how long a
 * failure should take), so the message is looked for first.
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
  for (const block of failureBlocks(text)) {
    const message = failureMessage(block)
    if (message === null) continue
    const m = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    const { where, title } = splitTitlePath(m?.[1] ?? '')
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
  // Otherwise the durations: the largest set of failures that took the same time to within the
  // band. A test that runs to its timeout prints slightly different durations on each attempt
  // (15.6 s, 15.1 s, 15.0 s), so the band is 0.5 s or 5% of the duration, whichever is larger.
  const tests = distinctTests(failedTests(text))
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

/** How many of a repeating cause's failures the note lists before it says "and N more". */
export const REPEATING_FAILURE_LISTED = 5

/** How many causes a finished run's summary lists before it says "and N more". */
export const FAILURE_CAUSES_LISTED = 5

/** How many of one cause's tests that summary names before it says "and N more". */
export const FAILURE_CAUSE_TESTS_LISTED = 6

/**
 * The shortest unambiguous tail of a logged path's FILE (`…/specs/e2e/articles.spec.ts` →
 * `e2e/articles.spec.ts`).
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
}

/**
 * Whether a repeating cause is failing the whole run — the one case where stopping it is the
 * right call.
 *
 * The test is: the cause accounts for every failure the log names, it has hit
 * {@link UNIVERSAL_CAUSE_FILES} spec files or more, and nothing has passed since its first
 * failure. An app that is not up, a 5xx on every request, or a selector that is missing on every
 * page all look like that, and every remaining test will fail the same way — so the run's
 * remaining minutes measure nothing. Anything less is NOT this: a cause that stops at one file,
 * or that leaves other tests passing, or that shares the run with failures of another shape,
 * leaves the run with something to say, and the run is the only thing that will say it. X1
 * flash-m83 (2026-10-16) stopped eight local runs at their first repeating cause over 14.5
 * minutes and never finished one; three of its deploys each fixed a single cause that a finished
 * run would have listed alongside the others.
 *
 * @param log - The log so far.
 * @param found - The repeating cause {@link repeatingFailure} found in it.
 * @returns The cause's count and files, or null when the run is not failing whole.
 */
export function universalCause(log: string, found: RepeatingFailure): UniversalCause | null {
  const text = log.replace(ANSI_SGR, '')
  const files = [...new Set(found.tests.map((t) => specFile(t.where)).filter(Boolean))]
  if (files.length < UNIVERSAL_CAUSE_FILES) return null
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

/** One cause of failure in a run, and the tests it hit. */
export interface FailureCause {
  /** The error line its tests all reported, or null when only the duration ties them together. */
  message: string | null
  /** The duration they shared in seconds, or null when the error line is the signature. */
  seconds: number | null
  /** The distinct tests it hit, in the order the log named them. */
  tests: FailedTest[]
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
 * The signature is the failures' own error line where the log carries their bodies (a finished
 * run, or a `line` reporter), and how long they took where it does not (a still-running `list`
 * log). A test the log printed twice, or failed twice, is one test.
 *
 * @param log - The log of a finished or running run.
 * @returns The causes, the one with the most tests first.
 */
export function failuresByCause(log: string): FailureCause[] {
  const text = log.replace(ANSI_SGR, '')
  const byMessage = new Map<string, FailedTest[]>()
  for (const block of failureBlocks(text)) {
    const message = failureMessage(block)
    if (message === null) continue
    const m = FAILURE_BLOCK_HEADER.exec(block.split('\n')[0] ?? '')
    const { where, title } = splitTitlePath(m?.[1] ?? '')
    const group = byMessage.get(message)
    if (group) group.push({ where, title, seconds: null })
    else byMessage.set(message, [{ where, title, seconds: null }])
  }
  const causes: FailureCause[] = []
  for (const [message, members] of byMessage) {
    const tests = distinctTests(members)
    if (tests.length > 0) causes.push({ message, seconds: null, tests })
  }
  // The failures with no body of their own — every failure of a still-running `list` log — are
  // grouped by how long they took: a band is opened by its first test and takes the ones that
  // then ran the same length, the same band {@link repeatingFailure} uses.
  const claimed = new Set(causes.flatMap((c) => c.tests.map(testKey)))
  const unclaimed = distinctTests(failedTests(text)).filter(
    (t): t is FailedTest & { seconds: number } => t.seconds !== null && !claimed.has(testKey(t)),
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
  for (const g of byDuration) causes.push({ message: null, seconds: g.seconds, tests: g.tests })
  return causes.sort((a, b) => b.tests.length - a.tests.length)
}

/**
 * The one-line-per-cause summary of a finished run's failures, or null when the run named fewer
 * than two of them.
 *
 * This is what makes a run worth finishing: every cause the run found, in the result the
 * executor reads, so one round of fixes covers all of them rather than the one cause a run
 * stopped early happened to reach.
 *
 * @param log - The finished run's output.
 * @returns The note, or null.
 */
export function failureCausesNote(log: string): string | null {
  const causes = failuresByCause(log)
  const total = causes.reduce((n, c) => n + c.tests.length, 0)
  if (total < 2) return null
  const listed = causes.slice(0, FAILURE_CAUSES_LISTED)
  const lines = listed.map((c, i) => {
    // The path the log itself wrote, never a shortened one: it is relative to the command's own
    // cwd, so it is the form the executor can paste back (X1 flash-m82 read a shortened
    // `e2e/auth.spec.ts:19` as the suite's own stale starter spec, rewrote its Playwright config
    // over it and deleted the app's tests — 4 minutes of a 60-minute run on a working config).
    const tests = c.tests.slice(0, FAILURE_CAUSE_TESTS_LISTED).map((t) => t.where || t.title)
    const more =
      c.tests.length > tests.length ? `, … and ${c.tests.length - tests.length} more` : ''
    const signature = c.message !== null ? `\`${c.message}\`` : `each after ~${c.seconds}s`
    const files = new Set(c.tests.map((t) => specFile(t.where)).filter(Boolean)).size
    return (
      `  ${i + 1}. ${signature} — ${c.tests.length} test${c.tests.length === 1 ? '' : 's'} ` +
      `in ${files} file${files === 1 ? '' : 's'}: ${tests.join(', ')}${more}`
    )
  })
  const moreCauses =
    causes.length > listed.length ? `\n  … and ${causes.length - listed.length} more causes` : ''
  return (
    `${total} failure${total === 1 ? '' : 's'} in this run, grouped by cause — fix every cause ` +
    `below before the next deploy:\n${lines.join('\n')}${moreCauses}`
  )
}

/**
 * The sentence that names a cause repeating among a running suite's failures, mid-run.
 *
 * Kept here, beside {@link repeatingFailure}, so the two stay in step: every word below is about
 * what that function could actually see in the log — including the count, which is of DISTINCT
 * tests, so the note never names one or two tests as a cause.
 *
 * The note names the cause early so the executor can START FIXING while the run keeps walking,
 * and it asks for the run to be stopped only when {@link universalCause} says the cause is
 * failing the whole run. X1 flash-m76 (2026-10-16) spent 4.0 minutes walking 15 tests whose one
 * cause was certain at the third, 47 s in, and the note answers exactly that; X1 flash-m83 then
 * stopped eight runs at their first repeating cause in 14.5 minutes and never finished one, so
 * the note must not say to stop when the run still has other causes to name.
 *
 * @param found - What {@link repeatingFailure} found.
 * @param o - The run's facts: its `taskId`, its `log` path, `stop` — the shell command that
 *   stops it, printed only for a {@link UniversalCause} — and `universal`, what
 *   {@link universalCause} found (absent means the run is not failing whole).
 * @returns The note.
 */
export function repeatingFailureNote(
  found: RepeatingFailure,
  o: { taskId: string; log: string; stop: string; universal?: UniversalCause | null },
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
  const signature =
    found.message !== null
      ? `every one with \`${found.message}\``
      : `each after ~${found.seconds}s — the same duration to within half a second`
  const first = found.tests[0]
  const reproduce =
    first?.where && !found.message
      ? ` \`${first.where}\` alone reproduces the first one.`
      : first?.where
        ? ` Re-run \`${first.where}\` alone to see its error in full.`
        : ''
  const where = `task ${o.taskId}, log ${o.log}`
  if (o.universal) {
    const files = o.universal.files.map(shortFile)
    const shown = files.slice(0, 4).join(', ')
    const moreFiles = files.length > 4 ? `, … and ${files.length - 4} more` : ''
    return (
      `Every test this run has walked so far has failed the same way — all ${found.count} of ` +
      `them, ${signature} — across ${files.length} files (${shown}${moreFiles}), with nothing ` +
      `passing since the first:\n${rows}${more}\n` +
      `Every remaining test will fail the same way too, so walking the rest of this run only ` +
      `repeats this one cause. Stop it and fix that cause first: \`exec_command: ${o.stop}\`, ` +
      `then run the whole suite again. It is still going (${where}).${reproduce}`
    )
  }
  return (
    `${found.count} different tests in this run have already failed the same way — ${signature} — ` +
    `so one cause is repeating:\n${rows}${more}\n` +
    `Start fixing it now, while the run keeps walking.${reproduce} ` +
    `Let the rest of the run finish — it is the only thing that will name the causes that are NOT ` +
    `this one, and a run stopped at its first repeating cause costs a second whole run to find ` +
    `them. Stop it only if every test it walks fails this same way (the app unreachable, a 5xx on ` +
    `every request, the same selector timing out on every test of every file so far). ` +
    `It is still going (${where}).`
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
