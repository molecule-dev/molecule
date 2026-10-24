/**
 * The ONE rule that decides whether a suite run may start while another is already walking, and
 * the command readings both sides of it need.
 *
 * Two sites ask "may a second run start now?" about the same pair of runs — the mid-run note that
 * tells the executor what to do next while the suite it is waiting on is still going
 * ({@link ./utilities.js} `repeatingFailureNote`), and the hold that refuses the run when it
 * arrives (molecule-dev's `suite-overlap-hold.ts`) — and until xr-molecule-flash-m89 they answered
 * it separately. That run's +19:59 `wait_for_task` handed over a repeating cause with "the test
 * alone reproduces the first one … start on them now, while the run keeps walking"; 23 s later the
 * executor sent exactly that re-run, and the overlap hold refused it — "A playwright suite is
 * already running against this app and database … Wait for it." Two orders, one run, and the round
 * trip between them was the whole cost.
 *
 * So the rule lives here ({@link suiteRunInTheWay}) and both of them call it: a run may start only
 * when nothing in flight is already measuring the same app and database. What "the same app and
 * database" MEANS lives here too ({@link suiteCommandTarget}) — the note and the hold have to key
 * a command the same way before they can agree on whether two of them collide, and the re-run a
 * note hands over is built from the same reading of the running command
 * ({@link scopedRerunCommand}).
 *
 * The same treatment for the other pair that answered one question twice: whether a run walks the
 * WHOLE suite or a part of it. The rewriter that decides whether a background Playwright run gets
 * `--retries=0` ({@link ./utilities.js} `streamingBackgroundCommand`) and the platform's own notes
 * (molecule-dev's `suite-cli-override.ts`) asked it separately — a regex there, a predicate here —
 * until xr-molecule-flash-m89 showed the two answers were never the same question
 * ({@link isDiagnosisRun}).
 *
 * @module
 */

import { posix } from 'node:path'

import {
  commandSegments,
  type LocatedCommandSegment,
  locatedCommandSegments,
  statementBoundary,
} from './command-position.js'
import { commandRunsNoTests } from './no-test-run.js'
import { matchingExcludedTitles, shellQuote, suiteRunStatements } from './utilities.js'

/**
 * A command with its heredoc bodies removed: the runs, kills and hosts it names in a file it
 * WRITES are not what the command itself does.
 *
 * The header is kept (`cat > run.sh <<'EOF' …EOF` leaves `cat > run.sh`), which is what the
 * readers here want: everything before the body is still readable as the command's own words.
 *
 * @param command - The shell command.
 * @returns The command without its heredoc bodies.
 */
export function withoutHeredocs(command: string): string {
  return command.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g, ' ')
}

/**
 * The server a suite command points at, as a comparable key: the host it names (`HOST=`,
 * `BASE_URL=`, `PLAYWRIGHT_BASE_URL=`, `--variable host=`, or a bare URL), or `local` for a run
 * that names none — a suite run in the sandbox goes to the sandbox's own app unless the command
 * says otherwise. Every localhost spelling collapses to `local` (one sandbox, one app, one
 * database).
 *
 * @param command - The suite command.
 * @returns The target key.
 */
export function suiteCommandTarget(command: string): string {
  const text = withoutHeredocs(command)
  const named =
    /(?:\b(?:HOST|BASE_URL|PLAYWRIGHT_BASE_URL|E2E_BASE_URL)|--variable\s+host)\s*=\s*['"]?([^\s'"|;&]+)/i.exec(
      text,
    )?.[1] ?? /https?:\/\/[^\s'"|;&]+/i.exec(text)?.[0]
  if (!named) return 'local'
  const value = named.trim()
  let host: string
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`)
    host = url.hostname.toLowerCase()
    if (!/^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\])$/.test(host))
      return url.port ? `${host}:${url.port}` : host
  } catch (_error) {
    // Not a URL at all (a shell variable the command does not expand): compare
    // the token itself, so the same spelling still reads as the same target.
    return value.toLowerCase()
  }
  return 'local'
}

/** Whether a Playwright statement already names its own config (`-c`, `--config`, `--config=`). */
const NAMES_CONFIG = /(?:^|\s)(?:-c|--config)(?:\s+|=)/

/**
 * Whether a Playwright statement names its own config — the reading {@link withSuiteConfig} and
 * {@link scopedRerunCommand} share, so neither adds a second `--config` to a command that has one.
 *
 * @param command - A command, or the Playwright statement inside it.
 * @returns True when the statement loads a config of its own.
 */
export function namesSuiteConfig(command: string): boolean {
  return NAMES_CONFIG.test(command)
}

/**
 * The command with a `--config` added to the Playwright invocation it starts — or unchanged when
 * it already names one, or starts no Playwright run.
 *
 * The flag rides the same statement the runner does: a `cd`, an env prefix and a `timeout` before
 * it are left exactly as they were, and so is everything chained after the run (`| tail -50`).
 *
 * xr-molecule-flash-m113 (+19:09): the model's fix-round re-run dropped the
 * `--config playwright.conduit.config.ts` both earlier runs had carried, so Playwright started with
 * NO base URL and all 10 failures were `page.goto: Cannot navigate to invalid URL` — a failure list
 * that says nothing about the app. The platform composes commands back to the executor too (the
 * narrowed re-run of a finished run's failures), and a command it hands back has to carry the
 * config the run was measured under, never the shape that caused that finding.
 *
 * @param command - The command as the executor sent it.
 * @param config - The config the run loads, when the caller knows it.
 * @returns The command with the flag, or the command unchanged.
 */
export function withSuiteConfig(command: string, config: string | null | undefined): string {
  if (!config) return command
  const run = playwrightStatement(command)
  if (run === null) return command
  if (namesSuiteConfig(command.slice(run.start, run.end))) return command
  // Right after the runner's own words (`playwright test <here>`), so a launcher in front of
  // them — `npx --no-install`, `node <path>/playwright` — is untouched and the flag is the
  // runner's own argument wherever it sits.
  return `${command.slice(0, run.afterRunner)} --config ${shellQuote(config)}${command.slice(run.afterRunner)}`
}

/**
 * A redirect that names a FILE for a stream whose target a re-run would destroy: `> f`, `>> f`,
 * `1> f`, `&> f`. `2>` is stderr and deliberately not matched; a descriptor duplication
 * (`2>&1`, `>&2`) has no file target and does not match either, because `&` cannot start one.
 */
const FILE_REDIRECT = /(^|\s)(&>>?|1?>>?)(\s*)(?:'([^']+)'|"([^"]+)"|([^\s;&|]+))/g

/** A target that is not a log anyone could lose: rewriting it would CREATE a file. */
const DEVICE_TARGET = /^\/dev\//

/**
 * The command's words, quotes kept whole and with the offsets they were written at — the reading
 * {@link dropSupersededSelections} tokenizes the runner's arguments with AND the one a redirect
 * reader may not look inside: a quoted `--grep 'a > b'` is one word, and its `>` is the filter's
 * text, not a redirect.
 */
const ARGUMENT_WORD = /"(?:\\.|[^"\\])*"|'[^']*'|\S+/g

/** A span of the command. */
interface CommandSpan {
  start: number
  end: number
}

/**
 * The command's words as spans, in the order they were written.
 *
 * @param command - The shell command.
 * @returns Each word's span in the command.
 */
function wordSpans(command: string): CommandSpan[] {
  return [...command.matchAll(ARGUMENT_WORD)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
}

/**
 * Whether an offset sits strictly INSIDE one of the command's words rather than between them —
 * the quoted data a redirect reader must leave alone.
 *
 * @param at - The offset being read.
 * @param words - The command's word spans.
 * @returns True when the offset is inside a word.
 */
function insideWord(at: number, words: readonly CommandSpan[]): boolean {
  return words.some((word) => at > word.start && at < word.end)
}

/** One replacement of a span of the command. */
interface TextEdit {
  start: number
  end: number
  text: string
}

/**
 * The command with the edits applied — right to left, so every edit's offsets are still the ones
 * its reader reported.
 *
 * @param command - The command the edits were read from.
 * @param edits - The replacements, as offsets in that command.
 * @returns The command with each span replaced.
 */
function applyTextEdits(command: string, edits: readonly TextEdit[]): string {
  let out = command
  for (const edit of [...edits].sort((a, b) => b.start - a.start))
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  return out
}

/**
 * The output redirects of ONE statement's text that name a file, as edits that point them at a
 * fresh sibling of the file they wrote (`/tmp/pw-full.log` → `/tmp/pw-full.rerun.log`).
 *
 * A redirect whose operator sits inside a quoted word is that word's text, not a redirect of the
 * statement: `npx playwright test --grep 'a > b' > /tmp/full.log` carries exactly one redirect.
 *
 * @param statement - The statement's text.
 * @param offset - The statement's offset in the command.
 * @param words - The command's word spans.
 * @param fresh - The exact old file → fresh file mapping the edits make, filled in here.
 * @returns The edits, in statement order.
 */
function freshRedirectEdits(
  statement: string,
  offset: number,
  words: readonly CommandSpan[],
  fresh: Map<string, string>,
): TextEdit[] {
  const edits: TextEdit[] = []
  for (const match of statement.matchAll(FILE_REDIRECT)) {
    const before = match[1] ?? ''
    const op = match[2] ?? ''
    const space = match[3] ?? ''
    const single = match[4]
    const double = match[5]
    const target = single ?? double ?? match[6] ?? ''
    // A `>` written inside a quoted value is that value's own text.
    if (insideWord(offset + (match.index ?? 0) + before.length, words)) continue
    // `/dev/null` and friends are not a report to preserve; leaving them keeps the re-run silent
    // the way the run was, where rewriting them would create a file nobody asked for.
    if (!target || DEVICE_TARGET.test(target)) continue
    // A descriptor (`>&2`) or a process substitution (`> >(tee …)`) is no file either.
    if (target.startsWith('&') || target.startsWith('(') || /^\d+$/.test(target)) continue
    const quote = single !== undefined || double !== undefined ? 1 : 0
    const start = offset + (match.index ?? 0) + before.length + op.length + space.length + quote
    const rewritten = `${target}.rerun.log`
    fresh.set(target, rewritten)
    edits.push({ start, end: start + target.length, text: rewritten })
  }
  return edits
}

/**
 * The file arguments of a `tee` stage, as edits that point them at a fresh sibling.
 *
 * A pipeline the suite feeds (`… 2>&1 | tee /tmp/full.log`) writes the run's own stream to the
 * files `tee` names, so a re-run through the same pipeline would overwrite the walk's report
 * exactly the way its own `> <file>` redirect would ({@link freshRedirectEdits}). A stage that
 * names no file, reads a device or carries flags keeps those words as written.
 *
 * @param statement - The stage's text.
 * @param offset - The stage's offset in the command.
 * @param fresh - The exact old file → fresh file mapping the edits make, filled in here.
 * @returns The edits, in stage order.
 */
function freshTeeEdits(statement: string, offset: number, fresh: Map<string, string>): TextEdit[] {
  const words = [...statement.matchAll(ARGUMENT_WORD)].map((match) => ({
    text: match[0],
    start: offset + (match.index ?? 0),
  }))
  const program = words.findIndex(
    (word) => unquoted(word.text).replace(/\/+$/, '').split('/').at(-1) === 'tee',
  )
  if (program < 0) return []
  const edits: TextEdit[] = []
  for (const word of words.slice(program + 1)) {
    const bare = unquoted(word.text)
    if (!bare || bare.startsWith('-') || DEVICE_TARGET.test(bare)) continue
    const quote = /^['"]/.test(word.text) ? 1 : 0
    const rewritten = `${bare}.rerun.log`
    fresh.set(bare, rewritten)
    edits.push({
      start: word.start + quote,
      end: word.start + word.text.length - quote,
      text: rewritten,
    })
  }
  return edits
}

/** One statement whose output is the suite run's own, and whether it is a `tee` stage. */
interface RunnerOutputStatement extends CommandSpan {
  /** Whether the statement's program is `tee`: the files it names hold the run's stream. */
  tee: boolean
}

/**
 * The statements that carry the suite run's OWN output: the Playwright statement, and every stage
 * of the pipeline it feeds (`| tee /tmp/full.log | tail -5`).
 *
 * The parse's own spans answer this, so the setup and the tail around the run are never read as
 * its output: `printf … > app/public/_redirects` writes a file BEFORE any suite starts, and
 * `; echo done > /tmp/done` runs after it, whatever their redirects look like. Only a `|` joins a
 * stage to the run's stream; a `;`, `&&` or newline starts a statement of its own whose output is
 * not the run's ({@link redirectRunnerOutputsToFreshFiles}).
 *
 * @param command - The composed command.
 * @returns The statements, or null when the command starts no Playwright run that can be placed.
 */
function runnerOutputStatements(command: string): RunnerOutputStatement[] | null {
  const located = locatedCommandSegments(command)
  const at = located.findIndex(
    (entry) => entry.segment !== null && PLAYWRIGHT_RUN.test(entry.segment.text),
  )
  if (at < 0) return null
  const place = (entry: LocatedCommandSegment, tee: boolean): RunnerOutputStatement | null => {
    if (entry.start === null || entry.end === null) return null
    // A statement can end on an enclosing group's closer (`( … 2>&1)`); the closer is the
    // shell's, not the statement's, so it is not part of what a redirect reader may rewrite.
    const end = statementBoundary(command, entry.start, entry.end)?.textEnd ?? entry.end
    return { start: entry.start, end, tee }
  }
  const runner = located[at]
  const first = runner === undefined ? null : place(runner, false)
  if (first === null) return null
  const statements = [first]
  for (let i = at + 1; i < located.length; i += 1) {
    const entry = located[i]
    // Only a stage of the SAME pipeline carries the run's output; anything else is the tail.
    if (entry === undefined || entry.separator !== '|') break
    const stage = place(entry, entry.segment?.program === 'tee')
    if (stage !== null) statements.push(stage)
  }
  return statements
}

/**
 * Readers whose non-flag operands are ALL files: a display of the run's own report. Every one of
 * them is read-only, so moving its operand with the file it reads cannot change what it does.
 */
const FILE_READERS: ReadonlySet<string> = new Set(['cat', 'head', 'tail'])

/**
 * grep-family readers: their first non-flag operand is the pattern, and the words after it are the
 * files they display — unless a `-e`/`-f` flag named the pattern already.
 */
const GREP_READERS: ReadonlySet<string> = new Set(['egrep', 'fgrep', 'grep'])

/** grep's pattern flags: the word after one is a pattern (or a pattern file), never a file. */
const GREP_PATTERN_FLAGS: ReadonlySet<string> = new Set(['-e', '--regexp', '-f', '--file'])

/**
 * The postlude statements that DISPLAY the run's own report, with the exact file that run wrote
 * pointed at the fresh sibling the re-run writes instead.
 *
 * xr-molecule-flash-o03 (2026-10-22; the stale-READ arm m248 filed at +25:55): the recipe the
 * platform handed the executor ended `> /tmp/e2e-local.log.rerun.log 2>&1; echo EXIT=$?; tail -80
 * /tmp/e2e-local.log`. The writer moved to the fresh sibling and the trailing tail did not, so the
 * narrowed re-run displayed the walk it was narrowed FROM — the builder followed that recipe at
 * +19:16 and read the previous walk's failures as the result of the run it had just done.
 *
 * Only the EXACT file a runner statement (or its `tee`) wrote moves, and only in a statement AFTER
 * the run: the setup in front of it keeps every byte (m429), and a read of any other file is left
 * alone. The value is compared whole — `/tmp/full.log` never matches `/tmp/full.log.bak` — and
 * inside shell quotes the operand's own quoting survives (`"/tmp/my walk.log"` stays quoted).
 *
 * The bound is deliberate: a display this reader set does not recognise (a `wc`, a path held in a
 * variable, a path the command builds) is left exactly as written rather than guessed at. Those
 * shapes are not the ones the platform emits, and rewriting a word by resemblance is how m429's
 * setup redirect was corrupted.
 *
 * @param command - The composed command.
 * @param statements - The statements carrying the run's own output.
 * @param fresh - The exact old file → fresh file mapping the redirect edits made.
 * @returns The edits, in statement order.
 */
function freshReportReadEdits(
  command: string,
  statements: readonly RunnerOutputStatement[],
  fresh: ReadonlyMap<string, string>,
): TextEdit[] {
  if (fresh.size === 0) return []
  const after = Math.max(...statements.map((statement) => statement.end))
  const edits: TextEdit[] = []
  for (const entry of locatedCommandSegments(command)) {
    const segment = entry.segment
    const start = entry.start
    const end = entry.end
    const programOffset = entry.programOffset
    // Only a statement the parse placed and that runs AFTER the walk can display its report.
    if (segment === null || start === null || end === null) continue
    if (start < after || programOffset === null) continue
    const allFiles = FILE_READERS.has(segment.program)
    const grep = GREP_READERS.has(segment.program)
    if (!allFiles && !grep) continue
    const text = command.slice(start, end)
    const words = [...text.matchAll(ARGUMENT_WORD)].map((match) => ({
      text: match[0],
      start: start + (match.index ?? 0),
    }))
    // The program word's own span, so the walk starts exactly where the parse says it does.
    const program = words.findIndex((word) => word.start === programOffset)
    if (program < 0) continue
    /** grep still owes its pattern: the first bare operand is that pattern, not a file. */
    let patternPending = grep
    for (let i = program + 1; i < words.length; i += 1) {
      const word = words[i]
      if (word === undefined) break
      if (ARGUMENT_REDIRECT_OPERATOR.test(word.text)) {
        // The operator's target is where the display WRITES, not a file it reads.
        i += 1
        continue
      }
      if (ARGUMENT_REDIRECT.test(word.text)) continue
      const flag = unquoted(word.text)
      if (flag.startsWith('-') && flag !== '-') {
        if (grep) {
          if (GREP_PATTERN_FLAGS.has(flag)) {
            patternPending = false
            i += 1
          } else if (/^(?:--(?:regexp|file)=|-[ef].)/.test(flag)) patternPending = false
        }
        continue
      }
      if (patternPending) {
        patternPending = false
        continue
      }
      const to = fresh.get(unquoted(word.text))
      if (to === undefined) continue
      const quote = /^['"]/.test(word.text) ? 1 : 0
      edits.push({
        start: word.start + quote,
        end: word.start + word.text.length - quote,
        text: to,
      })
    }
  }
  return edits
}

/**
 * The command with the SUITE RUN's own log files pointed at fresh siblings, and nothing else
 * changed.
 *
 * A re-run composed from a run's own command keeps the run's redirect by construction, and the
 * run wrote the walk's only report to that file: xr-molecule-flash-m173 handed over *"Send this
 * once the run ends: … npx playwright test …/articles.spec.ts:32 --retries=0 … > /tmp/pw-full.log
 * 2>&1"* — the ONE narrowed re-run that was about to check the fixes would have overwritten the
 * full walk's log, destroying the other 11 failures' error reports. Following the platform's own
 * advice must never destroy the evidence it was based on.
 *
 * Only the run's OWN stream moves. What surrounds it is SETUP and POSTLUDE, and those writes are
 * the command's meaning, not a report: xr-molecule-flash-m429 (2026-10-22) composed
 * `printf '/index.html 200' > app/public/_redirects && npx playwright test specs/auth.spec.ts
 * > /tmp/full.log 2>&1` with its SPA fallback written to `_redirects.rerun.log`, so the re-run
 * measured an app with no fallback at all. A heredoc config, a `.env` the command writes and a
 * source asset it lays down are the same shape: their targets stay byte-for-byte, and so does
 * every statement chained after the run (`; echo EXIT $? > /tmp/done`).
 *
 * Every statement chained after the run (`; echo EXIT $? > /tmp/done`) is postlude and keeps its
 * own writes, but the DISPLAY of the run's report is part of the same run: a `tail`, `head`, `cat`
 * or `grep` after the run that reads the exact file it wrote is pointed at the fresh sibling too
 * ({@link freshReportReadEdits}), so a re-run shows its own output instead of the walk's
 * (xr-molecule-flash-o03).
 *
 * @param command - The composed command.
 * @returns The command whose suite-run redirects write to a fresh target.
 */
function redirectRunnerOutputsToFreshFiles(command: string): string {
  const statements = runnerOutputStatements(command)
  if (statements === null) return command
  const words = wordSpans(command)
  const edits: TextEdit[] = []
  const fresh = new Map<string, string>()
  for (const statement of statements) {
    const text = command.slice(statement.start, statement.end)
    edits.push(...freshRedirectEdits(text, statement.start, words, fresh))
    if (statement.tee) edits.push(...freshTeeEdits(text, statement.start, fresh))
  }
  edits.push(...freshReportReadEdits(command, statements, fresh))
  return applyTextEdits(command, edits)
}

/**
 * The whole-suite command made scoped to the tests it should re-run instead: the same
 * invocation — same launcher, same settings — with the named `file:line`s in place of every
 * positional selection the run carried (a spec file, a suite directory or a regex filter),
 * `--last-failed` dropped (it re-runs the tests that never ran too, X1 flash-m60) and
 * `--retries=0` set (a re-run of a known failure does not need to pay for retries).
 *
 * The re-run keeps the run's `> <file>` redirect only in the sense of keeping its OUTPUT there:
 * the target is rewritten to a fresh sibling ({@link redirectRunnerOutputsToFreshFiles}), so a
 * re-run never overwrites the log the run itself is the evidence for (xr-molecule-flash-m173) —
 * and the setup around the run keeps its own file writes untouched (xr-molecule-flash-m429). A
 * `tail`/`head`/`cat`/`grep` chained after the run that reads that exact log is shown the fresh
 * sibling instead, so the re-run displays the run it performed (xr-molecule-flash-o03).
 *
 * `config` is the config the run was measured under ({@link withSuiteConfig}): the narrowed re-run
 * carries it whenever the command itself does not, so a run that dropped `--config` cannot be
 * handed back a command with the same defect (xr-molecule-flash-m113: every failing test was
 * `Cannot navigate to invalid URL` because the re-run loaded no base URL).
 *
 * @param command - The whole-suite run's command.
 * @param locations - The failing `file:line`s to re-run, as the run's own log printed them. A
 *   location the reporter printed relative to the runner's own directory (`../../fixtures/…`,
 *   which no absolute path contains) is resolved here ({@link playwrightLocations}), so the
 *   command this returns is one Playwright can match.
 * @param excluded - The test titles the request carves out. They are inverted out
 *   (`--grep-invert`) so a re-run of the failing locations cannot report one of them again —
 *   xr-molecule-flash-m101 re-ran the whole 139-test suite and spent ~4 minutes to be told about
 *   a test the request had already said does not count.
 * @param config - The config the run loaded, when the caller knows it; added when the command
 *   does not name one.
 * @param cwd - The directory `exec_command` was given, when it was; the base a location is
 *   resolved against when the command does not `cd` anywhere.
 * @param env - The settings the REQUEST requires of the suite and this run left out
 *   ({@link withRunEnv}): the re-run carries them, so a re-run of a run measured in the wrong
 *   mode is not measured in that mode again (xr-molecule-flash-m182 +12:06).
 * @returns The scoped command, or the command unchanged when it runs no Playwright suite.
 */
export function scopedRerunCommand(
  command: string,
  locations: readonly string[],
  excluded: readonly string[] = [],
  config?: string | null,
  cwd?: string | null,
  env: readonly RunEnvSetting[] = [],
): string {
  const run = playwrightStatement(command)
  if (run === null) return command
  // Only the first statement runs the suite; the rest (`| tail -50`, `&& echo done`)
  // is left exactly as it was.
  const statement = command.slice(run.start, run.end)
  const tail = command.slice(run.end)
  // The arguments after the runner's own words (`playwright test`), where the narrowed re-run
  // writes its locations — the launcher in front of them (`npx --no-install`, `node
  // <path>/playwright`) is not part of the arguments.
  const args = command.slice(run.afterRunner, run.end)
  // One literal alternation, regex-escaped and shell-quoted: a title carries parentheses and
  // quotes (`should only allow comment author to delete`) that are regex and shell syntax alike.
  const invert =
    excluded.length > 0 && !/--grep-invert\b/.test(command)
      ? ` --grep-invert ${shellQuote(
          excluded
            .map((t) => t.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|'),
        )}`
      : ''
  // The run's own config: the command's `--config` when it has one, else the config the caller
  // recorded for the run. A re-run without it measures nothing (m113).
  const carry = config && !namesSuiteConfig(statement) ? ` --config ${shellQuote(config)}` : ''
  // Playwright matches each positional argument as a regex against the ABSOLUTE path of every test
  // file it collects (`playwright test --help`: "Each argument is treated as a regular expression.
  // Matching is performed against the absolute file paths."), while the reporter prints a failure
  // relative to the runner's own directory. A `../../fixtures/…` location therefore matches
  // nothing — "No tests found" — so every location is rendered in a form Playwright can match
  // ({@link playwrightLocations}).
  const narrowed = playwrightLocations(locations, command, cwd)
  const dropped = dropSupersededSelections(args, narrowed)
    // `--last-failed` re-runs the tests that never ran too (flash-m60); its `--last-failed-file`
    // sibling only moves the file it reads and is a real option of the re-run.
    .replace(/\s*--last-failed(?!-)/g, '')
    .replace(/\s*--retries(?:[= ]\d+)?/g, '')
  const scoped =
    command.slice(0, run.afterRunner) +
    ` ${narrowed.join(' ')} --retries=0${carry}${invert}` +
    dropped
  // A command that starts the suite AGAIN after this statement is a chain of walks, not a re-run:
  // everything from the next suite runner on is dropped, so the composed command carries ONE walk.
  // X1 xr-molecule-flash-m157 (+14:02) was handed a re-run that still carried the chain's second
  // whole walk — 4.5 minutes measuring code it had not changed.
  const rerunTail = suiteRunStatements(tail).length > 0 ? '' : tail
  return withRunEnv(redirectRunnerOutputsToFreshFiles(`${scoped}${rerunTail}`), env)
}

/** One `NAME=value` the request requires of a suite run. */
export interface RunEnvSetting {
  name: string
  value: string
}

/** A `NAME=value` word in command position, optionally behind `export`/`env`. */
const ENV_WORD =
  /(^|[\s;&|(])(?:export[ \t]+|env[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)=('[^']*'|"[^"]*"|[^\s;&|]+)/g

/** The value a command gives a name, unquoted, or null when it sets none. */
function envValueOf(command: string, name: string): string | null {
  for (const m of command.matchAll(ENV_WORD)) {
    if (m[2] !== name) continue
    return (m[3] ?? '').replace(/^(['"])(.*)\1$/, '$2')
  }
  return null
}

/** The command with one `NAME=value` word taken out, whitespace and all. */
function withoutEnvWord(command: string, name: string): string {
  const pattern = new RegExp(
    `(^|[\\s;&|(])(?:export[ \\t]+|env[ \\t]+)?${name}=('[^']*'|"[^"]*"|[^\\s;&|]+)`,
  )
  const m = pattern.exec(command)
  if (!m) return command
  const start = m.index + m[1].length
  const end = m.index + m[0].length
  const left = /[ \t]*$/.exec(command.slice(0, start))?.[0] ?? ''
  const chain = /^[ \t]*(?:&&|\|\||;)[ \t]*/.exec(command.slice(end))
  // A word between two chained statements takes the following operator with it, so the result is
  // `a && b` and not `a && && b`.
  if (chain && left.length > 0)
    return command.slice(0, start) + command.slice(end + chain[0].length)
  if (left.length > 0) return command.slice(0, start - left.length) + command.slice(end)
  const right = /^[ \t]*/.exec(command.slice(end))?.[0] ?? ''
  return command.slice(0, start) + command.slice(end + right.length)
}

/**
 * The command with the request's required settings put in front of its RUN statement — the ONE
 * place every composed re-run gets them (xr-molecule-flash-m182).
 *
 * The settings are written at the statement's own assignment offset, never in front of the whole
 * command: a shell binds an assignment there to the statement's program, while one in front of the
 * whole command is the environment of its FIRST statement alone (`APP_BASE=… cd app && npx
 * playwright test` sets the variable for `cd`; xr-molecule-flash-m103 +28:08). A name the command
 * gives a different value is replaced, and one it already gives the required value is left as
 * written. When the parse cannot place the statement (a run inside a nested `sh -c '…'`), the
 * settings become `export`s, which no statement boundary can swallow.
 *
 * @param command - The command to carry them.
 * @param settings - The `NAME`/`value` pairs the request requires.
 * @returns The command, or the command unchanged when it already carries every setting.
 */
export function withRunEnv(command: string, settings: readonly RunEnvSetting[] = []): string {
  const added: string[] = []
  let out = command
  for (const setting of settings) {
    if (envValueOf(out, setting.name) === setting.value) continue
    out = withoutEnvWord(out, setting.name)
    added.push(`${setting.name}=${setting.value}`)
  }
  if (added.length === 0) return command
  const at =
    locatedCommandSegments(out).find(
      (entry) => entry.segment !== null && PLAYWRIGHT_RUN.test(entry.segment.text),
    )?.assignmentOffset ?? null
  const words = added.join(' ')
  return at === null ? `export ${words} && ${out}` : `${out.slice(0, at)}${words} ${out.slice(at)}`
}

/** A directory a `cd` can name literally: no `~`, no variable, no glob. */
const LITERAL_DIR = /^[A-Za-z0-9_./+-]+$/

/** A word without its shell quotes. */
const unquoted = (word: string): string => word.replace(/^['"]|['"]$/g, '')

/**
 * The absolute directory the Playwright statement in a command runs in, or null when the command
 * does not say.
 *
 * The reporter prints a failing test's file relative to the process directory the runner started
 * in (`../fixtures/…` from a run whose suite lives outside its own tree), so the directory has to
 * come from the command itself: `exec_command`'s `cwd` when it was given, then each `cd` before
 * the runner. Only a literal `cd` is followed — a target holding a variable, a glob or `~`
 * resolves nowhere useful, and a guessed absolute path is worse than the relative one the
 * reporter printed.
 *
 * @param command - The shell command.
 * @param cwd - The `cwd` the tool was given, when it was.
 * @returns The absolute directory, or null.
 */
function suiteRunDirectory(command: string, cwd?: string | null): string | null {
  let dir = typeof cwd === 'string' && cwd.startsWith('/') ? posix.normalize(cwd) : null
  for (const { segment } of locatedCommandSegments(command)) {
    if (segment === null) continue
    if (segment.program === 'cd') {
      const target = unquoted(segment.args[0] ?? '').replace(/\/+$/, '')
      if (!target || target.startsWith('-') || target.startsWith('~') || !LITERAL_DIR.test(target))
        return null
      // A shell `cd /abs` DISCARDS the directory before it; only a relative target resolves
      // against the one the run started in.
      if (target.startsWith('/')) dir = posix.normalize(target)
      else if (dir === null) return null
      else dir = posix.normalize(posix.join(dir, target))
      continue
    }
    if (segment.program === 'playwright' && segment.args[0] === 'test') break
  }
  return dir
}

/** A failure location's path and its `:line[:column]` suffix, split the way Playwright does. */
const LOCATION_LINE = /^(.*?)(:\d+(?::\d+)?)$/

/**
 * Each location in a form Playwright matches, so a re-run composed from a run's own report can
 * actually run.
 *
 * Playwright compiles every positional file argument into a regex and tests it against the
 * absolute path of each collected test file (`playwright test --help`; `createFiltersFromArguments`
 * → `forceRegExp` → `createFileMatcher`, verified against Playwright 1.63 with `--list`: the
 * reporter's `../../fixtures/…/articles.spec.ts:3` lists 0 tests, the absolute path lists 1). A
 * location the reporter printed relative to the runner's directory is resolved against it; where
 * that directory cannot be known, only the leading `./`/`../` segments are dropped, which leaves a
 * suffix the absolute path still contains (`fixtures/…/articles.spec.ts:3` matches).
 *
 * A location without a leading dot is left alone: it is either absolute or already a suffix of the
 * absolute path, and rewriting it against a mis-guessed base could only break it
 * (xr-molecule-flash-m118 +16:34 "No tests found"; m124 +18:38 the platform's own "Re-run just
 * these" command).
 *
 * @param locations - The failing `file:line`s as the run's log printed them.
 * @param command - The run's command, for its own `cd`s.
 * @param cwd - The `cwd` the tool was given, when it was.
 * @returns The locations, matchable by Playwright.
 */
function playwrightLocations(
  locations: readonly string[],
  command: string,
  cwd?: string | null,
): string[] {
  const base = suiteRunDirectory(command, cwd)
  return locations.map((location) => {
    const [, file = '', suffix = ''] = LOCATION_LINE.exec(location) ?? []
    if (!file.startsWith('./') && !file.startsWith('../')) return location
    const resolved = base === null ? file.replace(/^(?:\.{1,2}\/)+/, '') : posix.resolve(base, file)
    return `${resolved}${suffix}`
  })
}

/**
 * Every Playwright `test` option that takes its value from the NEXT word, read from the runner's
 * own option table (`playwright test --help`, Playwright 1.63 as the sandbox image ships it).
 *
 * A value here is never a positional selection however much it looks like a path:
 * `--config playwright.config.ts` names the config the run was measured under, and dropping it
 * because it ends in `.ts` would re-create m113 exactly (a re-run with no base URL).
 */
const SUITE_VALUE_FLAGS: ReadonlySet<string> = new Set([
  '--add-reporter',
  '--browser',
  '-c',
  '--config',
  '--global-timeout',
  '-g',
  '--grep',
  '-G',
  '--grep-invert',
  '--last-failed-file',
  '--max-failures',
  '--output',
  '--repeat-each',
  '--reporter',
  '--retries',
  '--run-agents',
  '--shard',
  '--test-list',
  '--test-list-invert',
  '--timeout',
  '--trace',
  '--tsconfig',
  '--ui-host',
  '--ui-port',
  '--update-source-method',
  '-j',
  '--workers',
])

/**
 * Options whose value is optional (`--debug [mode]`, `--only-changed [ref]`): the next word is
 * theirs unless it is another flag — the reading the runner's own command line takes.
 */
const SUITE_OPTIONAL_VALUE_FLAGS: ReadonlySet<string> = new Set([
  '--debug',
  '--only-changed',
  '-u',
  '--update-snapshots',
])

/**
 * `--project <project-name...>` takes every word up to the next flag, as the runner's own command
 * line does; a project name is a selection of projects, never a positional test filter.
 */
const SUITE_VARIADIC_VALUE_FLAGS: ReadonlySet<string> = new Set(['--project'])

/** A redirect written as one word (`2>&1`, `>/tmp/out.log`): not a selection. */
const ARGUMENT_REDIRECT = /^(?:\d*|&)(?:<<<|<<-?|>>?\|?|<>|>&|<&)(?:&?\d+|-|[^\s;&|()<>]*)?$/

/** A redirect operator whose target is the word after it (`> /tmp/out.log`). */
const ARGUMENT_REDIRECT_OPERATOR = /^(?:\d*|&)(?:<<<|<<-?|>>?\|?|<>|>&|<&)$/

/**
 * One word of the runner's raw arguments, with where it was written.
 */
interface ArgumentWord {
  text: string
  start: number
}

/**
 * The runner's own arguments with every positional selection taken out once the re-run names
 * failure locations.
 *
 * The re-run is "just these", and Playwright OR-s every positional argument into one selection:
 * ANY leftover positional re-admits tests the re-run is supposed to skip. A bare spec file
 * re-admits all of that file's tests (xr-molecule-flash-m118 (+45:24) ~297 s for one file and
 * fourteen duplicates; xr-molecule-flash-m134 (+20:0x) 32 tests instead of 8). A suite DIRECTORY
 * is the same argument and re-admits the WHOLE walk even beside fourteen exact `file:line`s —
 * xr-molecule-flash-m428's suggested "Re-run just these" kept
 * `/workspace/fixtures/realworld/specs/e2e` after `--config playwright.config.ts`, so the command
 * said 14 locations and selected every spec again. A regex positional filter selects files the
 * same way and goes too.
 *
 * What is NOT a selection survives byte-for-byte: every option and its value — whatever it looks
 * like (`--config playwright.config.ts`, `--output test-results`, `--grep 'a|b'`, a `--project`
 * list) — and every redirect. Quoting and spacing survive because the result is a span splice on
 * the raw text, never a rebuild from words.
 *
 * An empty `locations` list keeps the original selection untouched:
 * {@link scopedRerunCommand} is not narrowing anything then.
 *
 * @param args - The run's own arguments, after `playwright test`.
 * @param locations - The failing `file:line`s the re-run names.
 * @returns The arguments without their positional selections.
 */
function dropSupersededSelections(args: string, locations: readonly string[]): string {
  if (locations.length === 0) return args
  const words: ArgumentWord[] = []
  for (const match of args.matchAll(ARGUMENT_WORD))
    words.push({ text: match[0], start: match.index ?? 0 })
  const dropped = new Array<boolean>(words.length).fill(false)
  let at = 0
  while (at < words.length) {
    const word = words[at]?.text ?? ''
    if (ARGUMENT_REDIRECT_OPERATOR.test(word)) {
      // The operator and the target after it are one redirect, not two words to judge.
      at += 2
      continue
    }
    if (ARGUMENT_REDIRECT.test(word)) {
      at += 1
      continue
    }
    if (word.startsWith('-') && word !== '-') {
      // `--flag=value` carries its value inside the same word; only the flag's own name is read.
      if (word.includes('=')) {
        at += 1
        continue
      }
      if (SUITE_OPTIONAL_VALUE_FLAGS.has(word)) {
        const next = words[at + 1]?.text
        at += next !== undefined && !next.startsWith('-') ? 2 : 1
        continue
      }
      if (SUITE_VARIADIC_VALUE_FLAGS.has(word)) {
        at += 1
        while (at < words.length && !(words[at]?.text ?? '').startsWith('-')) at += 1
        continue
      }
      at += SUITE_VALUE_FLAGS.has(word) ? 2 : 1
      continue
    }
    // A bare word — a spec file, a directory or a regex filter — is a positional selection.
    dropped[at] = true
    at += 1
  }
  let out = ''
  let cursor = 0
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]
    if (word === undefined || !dropped[i]) continue
    // The whitespace in front of the word goes with it, so the result is not left double-spaced.
    let start = word.start
    while (start > cursor && /\s/.test(args[start - 1] ?? '')) start -= 1
    out += args.slice(cursor, start)
    cursor = word.start + word.text.length
  }
  return out + args.slice(cursor)
}

/**
 * One suite run, as the rule that decides whether a second may start beside it reads it.
 *
 * Both callers describe the runs in flight the same way and ask the same question of them; what
 * differs is only which runs each one knows about — the hold reads its ledger of background runs,
 * the note reads the one run it is waiting on.
 */
export interface SuiteRunInFlight {
  /** Whether the run invokes a suite at all: a `vitest`/`jest` run is not one, and cannot be. */
  runsSuite: boolean
  /** The app and database the run measures, as {@link suiteCommandTarget} keys it. */
  target: string
  /**
   * Whether the command being judged STOPS this run before starting its own — a kill comes first,
   * so a run the command itself stops is not in the way (xr-molecule-flash-m87's
   * `kill 19408 … ; npx playwright test …`).
   */
  stoppedByCommand?: boolean
}

/**
 * The run in flight that makes a second run a hazard, or null when nothing is in the way.
 *
 * This is the ONE rule the mid-run note and the suite-overlap hold both answer with: a suite run
 * may start only when this returns null, because two suites against one app and database share its
 * rows — the failures one causes the other cannot be told from real ones. A run that invokes no
 * suite is never in the way, and neither is one the candidate command stops first.
 *
 * @param candidate - The run about to start, by the app and database it would measure
 *   ({@link suiteCommandTarget}).
 * @param inFlight - The suite runs already going, in the order the caller found them.
 * @returns The first run in the way, or null.
 */
export function suiteRunInTheWay<T extends SuiteRunInFlight>(
  candidate: { target: string },
  inFlight: readonly T[],
): T | null {
  return (
    inFlight.find(
      (run) => run.runsSuite && run.target === candidate.target && !run.stoppedByCommand,
    ) ?? null
  )
}

/**
 * The Playwright invocation of a command, as its own command-position text (`playwright test …`),
 * or null when the command starts no Playwright run.
 *
 * The runner's own word has to END where the sub-command starts (`(?=\s|$)`, not a `\b`): a
 * segment can be a fragment beginning at a `playwright test` printed INSIDE a string
 * (`echo "then npx playwright test" && npx playwright test`), and a match that ends against the
 * closing quote is that echo. A version-pinned `playwright@1.44.0 test` is the same run.
 */
const PLAYWRIGHT_RUN = /^(?:@playwright\/test|playwright)(?:@\S+)?\s+test(?=\s|$)/

/**
 * The statement of a command that runs `playwright test`, and where its own arguments begin.
 *
 * Both rewrites that compose a command ({@link withSuiteConfig}, {@link scopedRerunCommand}) read
 * the run through the shared shell parse — the same answer every classifier gets — instead of
 * searching the text for `playwright test`. The search missed the runner reached by file (`node
 * <path>/@playwright/test/cli.js test`, xr-molecule-flash-m179), so a narrowed re-run of that run
 * silently stayed the whole suite.
 *
 * `afterRunner` is the offset just past the runner's own words (`playwright test`): the
 * sub-command is the word after the program word, wherever the program word is (the script path
 * behind `node`, the name itself otherwise), so an option written there is the run's own.
 *
 * @param command - The shell command.
 * @returns The statement's span and its argument offset, or null when no statement runs the suite.
 */
function playwrightStatement(
  command: string,
): { start: number; end: number; afterRunner: number } | null {
  for (const located of locatedCommandSegments(command)) {
    const segment = located.segment
    if (!segment || !PLAYWRIGHT_RUN.test(segment.text)) continue
    // A statement inside a nested `sh -c '<command>'` has no offsets here: its positions are
    // positions in that string, so nothing may be spliced at them.
    if (located.start === null || located.end === null || located.programOffset === null)
      return null
    const words = [...command.slice(located.programOffset).matchAll(/\S+/g)]
    const subcommand = words[1]
    if (subcommand === undefined) return null
    return {
      start: located.start,
      end: located.end,
      afterRunner: located.programOffset + (subcommand.index ?? 0) + subcommand[0].length,
    }
  }
  return null
}

/**
 * What narrows a Playwright run to a part of the suite by naming the failures themselves: spec
 * files and `file:line` locations. These are the selections a redeploy's targeted proof is
 * composed from.
 */
const NAMED_SELECTION = /\.(?:spec|test)\.[cm]?[jt]sx?\b|\.[cm]?[jt]sx?:\d+/

/**
 * What narrows a Playwright run by a title filter, or by the failures the run before it printed.
 * These are diagnoses however the run was launched. A cap is a diagnosis too, but
 * {@link boundsFailures} reads it before this point because its own "no cap" spelling
 * (`--max-failures=0`) has to be told apart.
 */
const FILTERED_SELECTION = /(?:^|\s)(?:-g|--grep|--grep-invert|-G|--last-failed|--only-changed)\b/

/**
 * What narrows a Playwright run to a part of the suite: either of the two above. Built from their
 * own sources so the two readings cannot drift apart.
 */
const NARROWED_RUN = new RegExp(`(?:${NAMED_SELECTION.source})|(?:${FILTERED_SELECTION.source})`)

/**
 * Whether a narrowed invocation is narrowed ONLY by the failures it names — the selection the
 * platform composes a redeploy's proof from ({@link NAMED_SELECTION}) — rather than by a title
 * filter or a last-failed set ({@link FILTERED_SELECTION}).
 *
 * @param run - The Playwright invocation's command-position text, without a `--grep-invert`.
 * @returns True when files/lines are the only narrowing.
 */
function namesOnlySelection(run: string): boolean {
  return NAMED_SELECTION.test(run) && !FILTERED_SELECTION.test(run)
}

/**
 * A `--grep-invert` (or its `-G` alias) with the pattern Playwright takes: quoted or bare, `=` or
 * whitespace between flag and value, the last occurrence winning as it does on the runner's own
 * command line. The flag's own name has to be followed by `=` or whitespace, so `--grep` never
 * matches `--grep-invert`; and a value never crosses a shell separator, so a flag written last
 * cannot eat the statement after it.
 */
const GREP_INVERT_VALUE =
  /(?:^|[\s;&|(])(?:--grep-invert|-G)(?:=|\s+)(?:'([^']*)'|"([^"]*)"|([^\s;&|]+))/g

/**
 * The `--grep-invert` pattern a Playwright invocation carries, or null when it carries none.
 *
 * @param run - The Playwright invocation's command-position text.
 * @returns The pattern as the command wrote it, or null.
 */
function grepInvertPattern(run: string): string | null {
  const last = [...run.matchAll(GREP_INVERT_VALUE)].at(-1)
  if (!last) return null
  return last[1] ?? last[2] ?? last[3] ?? null
}

/**
 * The invocation without its `--grep-invert` flags, so the OTHER narrowers can be read on their
 * own: a run that greps AND names a file is still a diagnosis whatever its inversion excludes.
 *
 * @param run - The Playwright invocation's command-position text.
 * @returns The same text with every `--grep-invert`/`-G` flag and value taken out.
 */
function withoutGrepInvert(run: string): string {
  return run.replace(GREP_INVERT_VALUE, ' ')
}

/**
 * What a caller knows about the run being judged beyond its command text.
 */
export interface DiagnosisRunContext {
  /**
   * The test titles the person's request excludes by name — the same reading molecule-dev's
   * `excludedTestTitles` gives the rest of the platform.
   */
  approvedExclusions?: readonly string[]
  /**
   * Whether the caller is STARTING this command as the graded proof itself — the run the app is
   * judged by, composed and launched by the platform — rather than the executor's own diagnosis.
   *
   * A redeploy's proof is the targeted set the last walk left: its command names the failures it
   * re-runs (`file:line`, and the specs they live in), so it reads as a narrowed run. That
   * selection is the proof's own scope, so the graded run keeps the suite's retries instead of
   * walking each failure once the way a diagnosis does. Only the selection is excused — a failed
   * cap, a title filter, a last-failed set and a local target stay diagnoses whatever the caller
   * says here — and only a command the PLATFORM composes and launches is ever the proof.
   *
   * Host code marks the launch input with {@link PLATFORM_PROOF} rather than a JSON key: tool
   * input a model sends is JSON, and JSON has no symbol keys, so no model call can claim this.
   */
  platformProof?: boolean
}

/**
 * The key host code sets on an `exec_command` input object to mark the launch as the platform's
 * own graded proof ({@link DiagnosisRunContext} `platformProof`).
 *
 * A SYMBOL, deliberately: a model's tool input is JSON, and JSON cannot carry a symbol key, so a
 * model can never forge this mark — a `platform_proof` key it writes into its own JSON is just an
 * unknown input key, and the handler ignores it. Object spreads through a consumer's wrappers, and
 * this package's own input normalization, keep symbol-keyed properties, so the host's intent
 * survives the real launch path.
 */
export const PLATFORM_PROOF: unique symbol = Symbol.for('@molecule/api-ai-tools/platform-proof')

/**
 * Whether an `exec_command` input object carries the host's {@link PLATFORM_PROOF} mark.
 *
 * @param input - The tool input as the handler received it.
 * @returns True only for a launch host code marked; false for anything a model sent.
 */
export function isPlatformProofLaunch(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    (input as { [PLATFORM_PROOF]?: unknown })[PLATFORM_PROOF] === true
  )
}

/**
 * The Playwright invocation's text when the command starts one, or null.
 *
 * @param command - The command as the executor sent it.
 * @returns The invocation's command-position text, or null.
 */
function playwrightRun(command: string): string | null {
  return (
    commandSegments(withoutHeredocs(command)).find((segment) => PLAYWRIGHT_RUN.test(segment.text))
      ?.text ?? null
  )
}

/**
 * Whether a `--max-failures` BOUNDS the walk: the flag is given a count above zero.
 *
 * Playwright's own spelling of "no cap" is zero — `maxFailures: 0` "disables the feature" — and
 * that is the flag the platform's `testRunNote` asks for on the uncapped whole-suite run ("run the
 * whole suite once with `--max-failures=0`"), which is why this is not a plain flag test.
 *
 * @param command - The command as the executor sent it.
 * @returns True when a failure cap would stop the walk.
 */
function boundsFailures(command: string): boolean {
  const flag = /(?:^|[\s;&|(])--max-failures(?![-\w])/.exec(command)
  if (!flag) return false
  const value = /(?:^|[\s;&|(])--max-failures(?:=|\s+)(['"]?)(\d[\d_]*)/.exec(command)?.[2]
  // A `--max-failures` with no count at all is not the uncapped spelling of anything: it is read
  // as a cap, the way Playwright's own default reading of the flag is a count of failures.
  if (value === undefined) return true
  return Number(value.replace(/_/g, '')) !== 0
}

/**
 * Whether a command walks a PART of a suite instead of all of it: a cap that stops it at a failure
 * count, the failures the last run printed (`--last-failed`, `--only-changed`), a title filter, or
 * named files/lines.
 *
 * THE one reading of that question, in one place. Two sites act on the answer and must never
 * disagree:
 *
 * - the command rewriter that adds `--retries=0` to a background Playwright run
 *   ({@link ./utilities.js} `streamingBackgroundCommand`) — a diagnosis walks each failure once,
 *   while the run the suite is judged by keeps the suite's own retries; and
 * - the platform's own notes (molecule-dev's `suite-cli-override.ts`), which must not tell the
 *   executor to drop the `--retries=0` the platform itself has just added — the contradiction X1
 *   flash-m74 and m75 filed, and m76 filed a third time.
 *
 * Until xr-molecule-flash-m89 they were a regex and a predicate that only LOOKED alike, and the
 * gap was exactly the run the platform had asked for: its `testRunNote` says "run the whole suite
 * once with `--max-failures=0`", and the rewriter read that cap flag as a capped diagnosis and
 * stripped the suite's retries from the uncapped proof run that follows a deploy — the one run the
 * graded run is compared against (+25:03, +31:39, +36:40 and +49:57, the last two against the
 * deployed URL, where a network blip is likeliest and the retries it dropped are the ones that
 * absorb it).
 *
 * `--max-failures=0` is Playwright's own "no cap" ({@link boundsFailures}), so it is not a
 * diagnosis. A command that starts no Playwright run is not one either (false): the question is
 * about a run already read as a Playwright suite.
 *
 * A `--grep-invert` is only a narrowing when it excludes MORE than the request already excludes.
 * When the caller passes those approved titles ({@link DiagnosisRunContext}) and the inverted
 * pattern names one of them — the request's own "except …" scope written as the flag, which
 * molecule-dev's `invertDecision` reads the same way — the run still walks the whole proof scope,
 * and it is not a diagnosis. xr-molecule-flash-m170 (+33:16): the deployed proof carried exactly
 * that exclusion, the rewriter added `--retries=0` to it, and the run lost the suite's retries on
 * the one walk where a network blip is likeliest.
 *
 * A command the PLATFORM composed and launched AS the graded proof keeps the suite's retries for
 * the SELECTION it composed — the failures a redeploy re-runs, named as files and `file:line`
 * ({@link DiagnosisRunContext} `platformProof`). Only that selection is excused: a cap, a title
 * filter, a last-failed set and a local target stay diagnoses, so the mark cannot turn a walk of
 * part of the suite into the graded measurement. Which targets are local is
 * {@link suiteCommandTarget}'s answer, and the launch rewrite asks it on the same reading
 * ({@link ./utilities.js} `streamingBackgroundCommand`).
 *
 * @param command - The command as the executor sent it.
 * @param context - The request's approved exclusions and whether this command IS the graded
 *   proof, when the caller knows them.
 * @returns True when the run is a diagnosis or a re-run, not the whole suite.
 */
export function isDiagnosisRun(command: string, context?: DiagnosisRunContext): boolean {
  // A cap bounds the walk whatever launched it. `--max-failures=0` is Playwright's own "no cap"
  // ({@link boundsFailures}), so the uncapped spelling is not read as a diagnosis here.
  if (boundsFailures(command)) return true
  const run = playwrightRun(command)
  if (run === null) return false
  // A run that only collects and prints (`playwright test --list`, `--version`) walks no part of
  // the suite either, and is not the whole-suite run the retries belong on.
  if (commandRunsNoTests(run)) return true
  const inverted = grepInvertPattern(run)
  // A file, a line, a `-g`, `--last-failed` … narrows the run whatever the inversion also drops.
  const selection = inverted === null ? run : withoutGrepInvert(run)
  if (NARROWED_RUN.test(selection)) {
    // The platform's own proof keeps the suite's retries for the failures it re-runs — the one
    // selection a redeploy composes. Every other narrower is still a diagnosis: a filter or a
    // last-failed set measures a part of the suite, capped or not.
    if (context?.platformProof === true && namesOnlySelection(selection)) return false
    return true
  }
  if (inverted === null) return false
  // No selector or filter narrows the run: only the inversion's own scope can make it a diagnosis.
  return matchingExcludedTitles(inverted, context?.approvedExclusions ?? []).length === 0
}
