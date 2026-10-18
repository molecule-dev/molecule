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

import { commandSegments, locatedCommandSegments } from './command-position.js'
import { commandRunsNoTests } from './no-test-run.js'
import { shellQuote, suiteRunStatements } from './utilities.js'

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
  const at = command.search(/\bplaywright\s+test\b/)
  if (at === -1) return command
  const head = command.slice(0, at)
  const rest = command.slice(at)
  const end = rest.search(/&&|\|\||;|\|/)
  const statement = end === -1 ? rest : rest.slice(0, end)
  const tail = end === -1 ? '' : rest.slice(end)
  if (namesSuiteConfig(statement)) return command
  return `${head}${statement.replace(
    /^(playwright\s+test)\b/,
    `$1 --config ${shellQuote(config)}`,
  )}${tail}`
}

/**
 * The whole-suite command made scoped to the tests it should re-run instead: the same
 * invocation — same directory, same settings — with the named `file:line`s in place of the whole
 * suite, `--last-failed` dropped (it re-runs the tests that never ran too, X1 flash-m60) and
 * `--retries=0` set (a re-run of a known failure does not need to pay for retries).
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
 * @returns The scoped command, or the command unchanged when it runs no Playwright suite.
 */
export function scopedRerunCommand(
  command: string,
  locations: readonly string[],
  excluded: readonly string[] = [],
  config?: string | null,
  cwd?: string | null,
): string {
  const at = command.search(/\bplaywright\s+test\b/)
  if (at === -1) return command
  const head = command.slice(0, at)
  const rest = command.slice(at)
  // Only the first statement runs the suite; the rest (`| tail -50`, `&& echo done`)
  // is left exactly as it was.
  const end = rest.search(/&&|\|\||;|\|/)
  const statement = end === -1 ? rest : rest.slice(0, end)
  const tail = end === -1 ? '' : rest.slice(end)
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
  const scoped = dropSupersededSpecFiles(statement, narrowed)
    .replace(/\s*--last-failed\b/g, '')
    .replace(/\s*--retries(?:[= ]\d+)?/g, '')
    .replace(/^(playwright\s+test)\b/, `$1 ${narrowed.join(' ')} --retries=0${carry}${invert}`)
  // A command that starts the suite AGAIN after this statement is a chain of walks, not a re-run:
  // everything from the next suite runner on is dropped, so the composed command carries ONE walk.
  // X1 xr-molecule-flash-m157 (+14:02) was handed a re-run that still carried the chain's second
  // whole walk — 4.5 minutes measuring code it had not changed.
  const rerunTail = suiteRunStatements(tail).length > 0 ? '' : tail
  return `${head}${scoped}${rerunTail}`
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

/** A spec-file argument Playwright accepts as its positional filter — never a flag. */
const SPEC_FILE_ARGUMENT = /^(?!-)[^\s]*\.(?:spec|test)\.[cm]?[jt]sx?(?::\d+(?::\d+)?)?$/

/**
 * The statement with every bare spec-file argument taken out once the re-run names failure locations.
 *
 * The re-run is "just these": Playwright matches each positional argument against every collected
 * file's path, so a bare file left beside the `file:line`s re-admits ALL of that file's tests.
 * xr-molecule-flash-m118 (+45:24) kept the one file its 14 failures were in ("~297s" for a file and
 * fourteen duplicates); xr-molecule-flash-m134 (+20:0x) kept all four files of a run whose 8
 * failures sat in two of them — 32 tests, ~3 min, instead of the 8 failures' ~30 s. A file with no
 * failure in it has nothing to re-run, so it goes too.
 *
 * @param statement - The Playwright statement, starting at its own `playwright test`.
 * @param locations - The failing `file:line`s the re-run names.
 * @returns The statement without its bare spec-file arguments.
 */
function dropSupersededSpecFiles(statement: string, locations: readonly string[]): string {
  if (locations.length === 0) return statement
  const runner = /^(playwright\s+test)\b/.exec(statement)
  if (runner === null) return statement
  const head = runner[1]
  const kept = statement
    .slice(head.length)
    .replace(/(^|\s+)([^\s]+)(?=\s|$)/g, (whole: string, _space: string, token: string) => {
      return SPEC_FILE_ARGUMENT.test(token) ? '' : whole
    })
  return `${head}${kept}`
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
 * What narrows a Playwright run to a part of the suite: a named file or line, a title filter, or
 * the tests the run before it printed (`--last-failed`, `--only-changed`).
 */
const NARROWED_RUN =
  /\.(?:spec|test)\.[cm]?[jt]sx?\b|\.[cm]?[jt]sx?:\d+|(?:^|\s)(?:-g|--grep(?:-invert)?|--last-failed|--only-changed)\b/

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
 * @param command - The command as the executor sent it.
 * @returns True when the run is a diagnosis or a re-run, not the whole suite.
 */
export function isDiagnosisRun(command: string): boolean {
  if (boundsFailures(command)) return true
  const run = playwrightRun(command)
  if (run === null) return false
  // A run that only collects and prints (`playwright test --list`, `--version`) walks no part of
  // the suite either, and is not the whole-suite run the retries belong on.
  if (commandRunsNoTests(run)) return true
  return NARROWED_RUN.test(run)
}
