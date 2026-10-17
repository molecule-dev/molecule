/**
 * A command that a budget stopped before it finished, and the state its result carries so no
 * reader can mistake it for a run that ended.
 *
 * X1 xr-molecule-flash-m93 (2026-10-16, +12:37) sent the supplied RealWorld suite as
 * `timeout 280 hurl --test --continue-on-error --jobs 1 … hurl/*.hurl 2>&1 | tail -60` and got
 * back `exitCode: 0`, four finished files' lines and nothing else. Two lies in one result: the
 * `timeout 280` killed the run at 280 s, and the `| tail` made the pipeline's status the status —
 * so the executor read a suite that stopped at its fifth file as a suite that ran and nearly
 * passed, fixed one message, and immediately sent the same 280-second command again (the run's
 * third, ~14 minutes of a 60-minute cap across three of them).
 *
 * So the tool never reports a stopped run as `exitCode: 0`. Such a result carries
 * `status: 'cut_at_budget'` and an exit code that is `null` whenever the number the pipeline
 * reported belongs to the filter rather than to the run, and every reader of a run's verdict reads
 * the state through {@link commandRunState} — a cut run is NOT RUN, never a pass.
 *
 * Two things stop a run, and both are read from the command and the result, never inferred:
 *
 * 1. **Its own bound** — a `timeout <N>` the command carries ({@link commandTimeoutSeconds}). The
 *    run used it, so the run was killed at it; with no closing tally in the output, the run did
 *    not finish. This is m93's shape.
 * 2. **This tool's budget** — the backend runs the command under `timeout` (see
 *    `backends/sandbox.ts`), which reports 124 whatever the pipeline did, and returns everything
 *    printed until then. The budget is the tool's own, so its number belongs to the tool.
 *
 * A runner's closing summary is what separates "used the bound and finished" from "stopped at the
 * bound", but it is only half the evidence: Playwright prints one when its process is stopped too,
 * listing just the tests it reached. So a summary is a finish only when it accounts for the total
 * the runner announced before it started ({@link suiteSummary}) — a summary that does not
 * reconcile is a stopped run like any other, and the result says so.
 *
 * @module
 */

import { commandTimeoutSeconds } from './command-position.js'
import { isSuiteRunCommand } from './utilities.js'

/**
 * The state a result carries when a budget stopped its command: a run that did not finish is not a
 * run that passed, and no reader may treat it as one.
 */
export const CUT_AT_BUDGET = 'cut_at_budget'

/** What a command's result records: a run that ended, or one a budget stopped. */
export type CommandRunState = 'ran' | typeof CUT_AT_BUDGET

/**
 * The state a command's result records — THE reader every verdict about a run goes through.
 *
 * A result that carries no state is a run that ended: the state is written where the run is
 * stopped ({@link commandCutRun}), so a result without it was never stopped by a budget this
 * platform set or can see. Results produced before this state existed read the same way, which is
 * what keeps a past turn's tally readable.
 *
 * @param result - The exec_command / wait_for_task result.
 * @returns The state the result records.
 */
export function commandRunState(result: unknown): CommandRunState {
  if (result === null || typeof result !== 'object') return 'ran'
  return (result as { status?: unknown }).status === CUT_AT_BUDGET ? CUT_AT_BUDGET : 'ran'
}

/**
 * The gap between a bound and the elapsed time a run killed at it reports. Zero, and deliberately
 * not a tolerance: a command killed at its bound reports AT LEAST the bound (the shell's own
 * bookkeeping runs after the kill, and this tool's round trip is on top), so any slack would only
 * make a SHORT bound fire on a run that finished inside it (`timeout 5 curl …` answering in 3 s).
 * A run that finished near its bound carried a summary that reconciles with its announced total —
 * {@link suiteSummary}.
 *
 * @param boundSeconds - The bound the run was allowed.
 * @returns The elapsed ms a run stopped at that bound reports at least.
 */
function atBoundMs(boundSeconds: number): number {
  return boundSeconds * 1000
}

/**
 * What a runner's own closing summary reports, and whether it accounts for the whole run.
 *
 * A summary is not by itself proof that the run finished. Playwright prints one when its process
 * is stopped too (SIGTERM/SIGINT), listing only the tests it reached — so a run killed at 36 of
 * 139 tests ends with the same `36 passed (2.5m)` line as a run that walked all 139. The only
 * thing that separates them is the total the runner announced before it started
 * (`Running 139 tests using 1 worker`), which {@link suiteSummary} reconciles the summary against.
 */
export interface SuiteSummary {
  /**
   * The total the runner announced before its first test, or null when it announced none (Hurl
   * announces nothing; Vitest's own summary line carries its total in parentheses).
   */
  announced: number | null
  /**
   * Every test the summary accounts for — the ones it passed, failed, marked flaky, timed out,
   * interrupted, skipped or left "did not run". This is how far the walk got, which is what a
   * stopped run's sentence says; a summary that accounts for fewer than {@link announced} was
   * printed by a process that stopped early.
   */
  accounted: number
  /** Whether the summary accounts for every test the runner announced. */
  finished: boolean
}

/** A runner's announcement of the whole walk — Playwright's `Running 139 tests using 1 worker`. */
const ANNOUNCED_TOTAL = /^\s*Running\s+(\d+)\s+tests?\s+using\b/gm

/**
 * One line of Playwright's end-of-run tally — `  1 failed`, `  36 passed (2.5m)`,
 * `  1 did not run`.
 */
const SUMMARY_STATUS =
  /^\s*(\d+)\s+(passed|failed|flaky|skipped|interrupted|timed out|did not run)\b/gm

/**
 * Vitest's end-of-run tally — `Tests  1 failed | 149 passed (151)` — whose parenthesised number is
 * the total the line accounts for, and so its own announcement ({@link SuiteSummary.announced}).
 */
const VITEST_TESTS = /^\s*Tests\s+(.+?)\s+\((\d+)\)\s*$/gm

/** One status inside Vitest's `Tests` line — `149 passed`. */
const VITEST_STATUS = /(\d+)\s+(passed|failed|skipped|todo)\b/g

/** Hurl's closing block, printed only by a run that walked its whole file list. */
const HURL_TALLY = /\bExecuted files:\s*\d+/

/**
 * The marker {@link truncateMiddle} puts before the tally lines it restores — read only when the
 * truncated text carries no tally line of its own.
 */
const RESTORED_TALLY = /\[run tally\]\s*([^\n]*)/g

/** One status inside a restored tally line — `36 passed`. */
const RESTORED_STATUS = /(\d+)\s+(passed|failed|flaky|skipped|interrupted|timed out|did not run)\b/g

/**
 * Add the statuses in `text` to a running tally.
 *
 * Every status counts the same way: a test the runner skipped or left "did not run" was still
 * reached, which is what a stopped run's count measures.
 *
 * @param text - A tally line, or a block of them.
 * @param re - The status pattern to read them with.
 * @param counts - The tally to add to.
 */
function addStatuses(text: string, re: RegExp, counts: { accounted: number; saw: boolean }): void {
  for (const m of text.matchAll(re)) {
    counts.saw = true
    counts.accounted += Number(m[1])
  }
}

/**
 * What the runner's closing summary accounts for, or null when it printed none.
 *
 * Three runners' summaries are read, each by its own wording: Playwright's per-status lines
 * (reconciled against its `Running N tests` announcement), Vitest's single `Tests …` line (its own
 * parenthesised total), and Hurl's `Executed files:` block (which it prints only at the end, and
 * which announces no total — so it is a finish by construction).
 *
 * @param text - The run's stdout and stderr, RAW (a truncated copy can lose the announcement).
 * @returns The summary, or null when the text carries none.
 */
export function suiteSummary(text: string): SuiteSummary | null {
  if (typeof text !== 'string' || !text) return null
  let announced: number | null = null
  for (const m of text.matchAll(ANNOUNCED_TOTAL)) announced = Number(m[1])
  const counts = { accounted: 0, saw: false }
  addStatuses(text, SUMMARY_STATUS, counts)
  if (!counts.saw) {
    // Only when no tally line of its own survived: the restored line is a copy of lines that may
    // also be present, and adding both would over-count a cut run into a finish.
    for (const m of text.matchAll(RESTORED_TALLY)) addStatuses(m[1] ?? '', RESTORED_STATUS, counts)
  }
  if (counts.saw) {
    return {
      announced,
      accounted: counts.accounted,
      finished: announced === null || counts.accounted >= announced,
    }
  }
  const vitest = [...text.matchAll(VITEST_TESTS)].at(-1)
  if (vitest) {
    const total = Number(vitest[2])
    const line = { accounted: 0, saw: true }
    addStatuses(vitest[1] ?? '', VITEST_STATUS, line)
    return { announced: total, accounted: line.accounted, finished: line.accounted >= total }
  }
  // Hurl prints `Executed files:` only after walking its whole list.
  if (HURL_TALLY.test(text)) return { announced: null, accounted: 0, finished: true }
  return null
}

/**
 * Whether text carries a runner's closing summary.
 *
 * A summary is NOT a finish on its own — a stopped Playwright run prints one too. Use
 * {@link suiteSummary} and its `finished` for that.
 *
 * @param text - The run's stdout and stderr.
 * @returns True when the runner's own end-of-run summary is there.
 */
export function suiteTally(text: string): boolean {
  return suiteSummary(text) !== null
}

/** A failure count in a runner's own tally — `1 failed`, `Tests  1 failed | 149 passed (151)`. */
const FAILED_TALLY = /\b[1-9]\d*\s+failed\b/

/**
 * The exit code a finished suite run may report.
 *
 * The code in a background result is the code of the command's LAST pipeline stage. When a stage
 * after the suite runner still consumes its output (`| tee run.log`, or a filter the platform could
 * not prove output-only), that stage produced the code, not the run — and `… | grep … | tail -20`
 * exited 0 for a run with a failure in it (xr-molecule-flash-m101 +25:54). No code is reported
 * then: the log's own tally decides.
 *
 * The same reading covers a code of 0 beside a tally that names a failure: whatever ended the
 * pipeline, a run whose log counts a failure did not pass.
 *
 * @param exitCode - The code the pipeline reported (null when it has none).
 * @param output - The run's full log.
 * @param piped - Whether a pipeline stage after the suite runner still consumes its output.
 * @returns The code the run may report, or null when the code is the filter's or contradicts the tally.
 */
export function suiteRunExitCode(
  exitCode: number | null,
  output: string,
  piped: boolean,
): number | null {
  if (piped) return null
  if (exitCode === 0 && FAILED_TALLY.test(output)) return null
  return exitCode
}

/** What stopped a run. */
export type CutBy =
  /** This tool's own budget (the backend's `timeout`, just past it). */
  | 'tool-budget'
  /** The `timeout <N>` the command itself carried. */
  | 'command-timeout'
  /**
   * Something outside the run: the runner's summary does not account for the total it announced,
   * and neither of the two bounds above had fired — the process was killed by something this
   * platform does not own (the sandbox's own process supervisor, the box going away, a signal).
   */
  | 'process-stop'

/** A run a budget stopped, as its result reports it. */
export interface CutRun {
  /** The bound the run was allowed, in seconds. */
  seconds: number
  /** Whether this tool's budget stopped it or the `timeout` the command carried. */
  stoppedBy: CutBy
  /**
   * The exit code the run's own process reported, or null when the code in the result belongs to
   * the pipeline's filter (`… | tail`) rather than to the run — the case that read as success.
   */
  exitCode: number | null
  /**
   * How far the run got, as its own output counts it — the files that finished, or the tests its
   * summary accounts for — or null when the output says nothing.
   */
  ran: number | null
  /**
   * How many the run was walking: the total its runner announced (`Running 139 tests`), or
   * Playwright's `[n/K]`, whichever the output carries; null when neither does.
   */
  total: number | null
  /** The noun the runner counts in. */
  noun: 'files' | 'tests'
  /** The last thing the run printed — the line a reader looks at first. */
  doing: string | null
}

/** The last thing a run printed: its last non-blank line, as one line and short enough to quote. */
function lastPrinted(text: string): string | null {
  const lines = text.split('\n')
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = (lines[i] ?? '').trim()
    if (line) return line.length > 180 ? `${line.slice(0, 177)}…` : line
  }
  return null
}

/** Hurl's per-file line: `Success hurl/articles.hurl (17 request(s) in 318 ms)`. */
const HURL_FILE_LINE = /^(?:Success|Failure)\s+(\S+)/gm

/** Playwright's progress line — `[5/13] specs/auth.spec.ts:10:5 › signs up`. */
const PROGRESS_LINE = /^\s*\[(\d+)\/(\d+)\]/gm

/**
 * What the runner's own output says the run got through.
 *
 * Hurl prints a line per finished file and no total unless it finished; Playwright's line reporter
 * prints `[n/K]` with both numbers, and its end-of-run summary (with the `Running N tests` total it
 * is reconciled against) says how far a stopped walk got. Neither is inferred from the command — a
 * run that printed nothing says nothing, which is what `null` means here.
 *
 * @param text - The run's stdout and stderr, raw.
 * @param suite - Whether the command runs a suite.
 * @param summary - The closing summary the text carries, when it carries one.
 * @returns How far it got, how many it was walking, and the noun.
 */
function runProgress(
  text: string,
  suite: boolean,
  summary: SuiteSummary | null,
): Pick<CutRun, 'ran' | 'total' | 'noun'> {
  const files = new Set<string>()
  for (const m of text.matchAll(HURL_FILE_LINE)) files.add(m[1] ?? '')
  if (files.size > 0) return { ran: files.size, total: null, noun: 'files' }
  // A summary that does not account for its announced total: both numbers come from the runner's
  // own lines, so the sentence can say `Ran 38 of 139` without the caller counting anything.
  if (summary && summary.announced !== null) {
    return { ran: summary.accounted, total: summary.announced, noun: 'tests' }
  }
  let ran: number | null = null
  let total: number | null = null
  for (const m of text.matchAll(PROGRESS_LINE)) {
    ran = Number(m[1])
    total = Number(m[2])
  }
  if (ran !== null) return { ran, total, noun: 'tests' }
  return { ran: null, total: null, noun: suite ? 'tests' : 'files' }
}

/**
 * The run a command's result records as stopped by a budget, or null when the result is a run that
 * ended (or says nothing about a run).
 *
 * Evidence, in order — never a guess:
 *
 * - the runner's own summary, when it printed one: it is a finish only if it accounts for the total
 *   the runner announced. A summary that accounts for fewer is a walk a process stopped early, and
 *   falls through to the branches below with its own counts ({@link suiteSummary}).
 * - `timeout`'s own 124 (the code the backend's wrapper returns whenever the TOOL's budget fired,
 *   whatever the pipeline ended with) — and, when the clock says the command's own smaller bound
 *   ran out first and less than the budget, that bound instead.
 * - the command carried its own `timeout <N>`, N is inside this tool's budget (a larger one never
 *   fires — the tool's does), the run used N, and no runner printed a closing summary: the run was
 *   killed at its own bound. Its exit code, when the pipeline handed one back, is the filter's.
 * - the run used this tool's whole budget behind a filter that withheld its output, and printed no
 *   closing summary: the budget stopped it, and no code in the result is the run's.
 * - a summary that does not account for its announced total, with neither bound fired: something
 *   outside this platform stopped the process ({@link CutBy} `process-stop`).
 *
 * @param command - The command the executor sent.
 * @param result - Its result.
 * @param elapsedMs - How long the command ran, in ms.
 * @param budgetSeconds - This tool's foreground budget, in seconds (0 when it has none).
 * @param rawOutput - The run's output BEFORE truncation, when the caller has it: the announcement
 *   a summary is reconciled against is the first line a long run prints, which is exactly what a
 *   size cap drops. Detection reads this; the sentence's last line still comes from `result`.
 * @returns The stopped run, or null.
 */
export function commandCutRun(
  command: string,
  result: unknown,
  elapsedMs: number,
  budgetSeconds = 0,
  rawOutput?: string,
): CutRun | null {
  if (typeof command !== 'string' || !command.trim()) return null
  if (result === null || typeof result !== 'object') return null
  if (!Number.isFinite(elapsedMs)) return null
  const r = result as { exitCode?: unknown; stdout?: unknown; stderr?: unknown }
  const exitCode = typeof r.exitCode === 'number' ? r.exitCode : null
  const text = `${String(r.stdout ?? '')}\n${String(r.stderr ?? '')}`
  const detected = typeof rawOutput === 'string' ? rawOutput : text
  // A runner's summary is a finish only when it accounts for the total the runner announced. A run
  // stopped at 36 of 139 prints the same `36 passed` line a finished run does (X1 xr-molecule-flash-
  // m101 +12:13 read `36 passed` as `exitCode: 0` and moved on), so the announcement decides.
  const summary = suiteSummary(detected)
  // Only a summary that ACCOUNTS for the announced total ends the search for a stop. No summary
  // at all is not a finish — it is the case the bounds below exist for.
  if (summary?.finished) return null
  const suite = isSuiteRunCommand(command)
  const withheld = /\|\s*(?:tail|head|grep|egrep|fgrep|sort|uniq|wc|jq)\b/.test(command)
  const progress = runProgress(detected, suite, summary)
  const doing = lastPrinted(text)
  const declared = commandTimeoutSeconds(command)
  // A command whose own bound is inside this tool's budget is stopped by ITS bound: a larger one
  // never gets the chance — the backend's `timeout` fires first (see the module doc). With no
  // tool budget at all (a reader re-reading a background run) the command's own bound is the only
  // one there is.
  const ownBoundStops = budgetSeconds === 0 || (declared !== null && declared < budgetSeconds)
  // `timeout`'s own 124 — the code the backend's wrapper returns when the TOOL's budget fires,
  // whatever the pipeline ended with (`backends/sandbox.ts`). Which of the two bounds fired is the
  // clock's to say: a run killed at the tool's budget reports at least the budget, and one killed
  // at its own bound reports at least that bound and less than the budget.
  if (budgetSeconds > 0 && exitCode === 124) {
    const ownFired =
      declared !== null &&
      ownBoundStops &&
      elapsedMs >= atBoundMs(declared) &&
      elapsedMs < atBoundMs(budgetSeconds)
    return {
      seconds: ownFired ? declared : budgetSeconds,
      stoppedBy: ownFired ? 'command-timeout' : 'tool-budget',
      exitCode,
      ...progress,
      doing,
    }
  }
  if (declared !== null && ownBoundStops && elapsedMs >= atBoundMs(declared)) {
    return {
      seconds: declared,
      stoppedBy: 'command-timeout',
      // A code the filter produced is not the run's: `… | tail` handed back 0 forever (m93).
      exitCode: withheld || exitCode === 0 ? null : exitCode,
      ...progress,
      doing,
    }
  }
  // The tool's budget with its code masked: the run used the whole budget and the pipeline left
  // nothing readable of it — no code of its own, and no runner's closing summary.
  if (budgetSeconds > 0 && withheld && elapsedMs >= atBoundMs(budgetSeconds)) {
    return {
      seconds: budgetSeconds,
      stoppedBy: 'tool-budget',
      exitCode: exitCode === 0 ? null : exitCode,
      ...progress,
      doing,
    }
  }
  // The runner printed a summary that does not account for the total it announced, and neither
  // bound above fired: the process was stopped from outside the run. A run that used the whole
  // budget is the backend's deadline (which sits just past it); anything else is a stop this tool
  // does not own. Either way the summary counts are all that ran, and a pipeline's 0 is not the
  // run's code — the run never reached its own verdict.
  if (summary !== null && summary.announced !== null) {
    const usedBudget = budgetSeconds > 0 && elapsedMs >= atBoundMs(budgetSeconds)
    return {
      seconds: usedBudget ? budgetSeconds : Math.max(1, Math.round(elapsedMs / 1000)),
      stoppedBy: usedBudget ? 'tool-budget' : 'process-stop',
      exitCode: withheld || exitCode === 0 ? null : exitCode,
      ...progress,
      doing,
    }
  }
  return null
}

/**
 * The facts a result records about the run a budget stopped it in — what a reader needs to say
 * how far the run got WITHOUT re-reading its log or re-deriving the counts.
 *
 * The numbers are read from the runner's own output where it printed them (Hurl's per-file lines,
 * Playwright's `[n/K]`), so a caller that can also see the suite itself — the file count of the
 * `*.hurl` directory the run walked — fills in the `total` this could not know, and both then say
 * the same sentence ({@link cutRunSentence}).
 *
 * @param result - The exec_command / wait_for_task result.
 * @returns The facts the result carries, or null when it records no stopped run.
 */
export function cutRunFacts(result: unknown): CutRun | null {
  if (result === null || typeof result !== 'object') return null
  if (commandRunState(result) !== CUT_AT_BUDGET) return null
  const cut = (result as { cutRun?: unknown }).cutRun
  if (cut === null || typeof cut !== 'object') return null
  const c = cut as Partial<CutRun>
  if (typeof c.seconds !== 'number' || typeof c.stoppedBy !== 'string') return null
  return {
    seconds: c.seconds,
    stoppedBy: c.stoppedBy,
    exitCode: typeof c.exitCode === 'number' ? c.exitCode : null,
    ran: typeof c.ran === 'number' ? c.ran : null,
    total: typeof c.total === 'number' ? c.total : null,
    noun: c.noun === 'tests' ? 'tests' : 'files',
    doing: typeof c.doing === 'string' && c.doing ? c.doing : null,
  }
}

/**
 * The first line of a stopped run's result: how far it got, what stopped it, the last thing it
 * printed, and what the reader must do next.
 *
 * Written to be quotable by the model in one sentence and to leave no room for "nearly passing":
 * the counts come from the runner's own output ({@link runProgress}), and a `total` the caller
 * read elsewhere (the suite's own file count) fills in the "of N" it can then state. The sentence
 * says how many tests the stop left unrun — a number a reader cannot round up to "the suite
 * passed" — and hands over the one move that survives a long run: run it in the background.
 *
 * @param run - The stopped run.
 * @returns The sentence.
 */
export function cutRunSentence(run: CutRun): string {
  const by =
    run.stoppedBy === 'tool-budget'
      ? "this tool's limit"
      : run.stoppedBy === 'command-timeout'
        ? `its own \`timeout ${run.seconds}\``
        : 'a process kill outside this tool (no `timeout` of its own and no limit of this tool had fired)'
  const background = 'run it in the background (run_in_background + wait_for_task)'
  const missing = run.ran !== null && run.total !== null ? run.total - run.ran : null
  const lead =
    missing !== null
      ? `Ran ${run.ran} of ${run.total} ${run.noun} in ${run.seconds} s and was stopped by ${by} — the ${missing} it never reached ${missing === 1 ? 'has' : 'have'} not run; ${background}`
      : run.ran !== null
        ? `Ran ${run.ran} ${run.noun} in ${run.seconds} s and was stopped by ${by} — the rest have not run; ${background}`
        : `This run was stopped after ${run.seconds}s (${by}) before it finished; ${background}`
  const doing = run.doing ? ` The last thing it was doing: ${run.doing}.` : ''
  // Why the result carries no code: without this the model reads the missing field as an
  // omission, and the number it used to read there was the pipeline's own 0.
  const code =
    run.exitCode === null
      ? ' It has no exit code of its own to report — the one this pipeline produced belongs to the filter, not to the run.'
      : ''
  return `${lead}.${doing}${code}`
}
