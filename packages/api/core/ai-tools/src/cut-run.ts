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
 * A run that finished near its bound carried its runner's closing summary — {@link suiteTally}.
 *
 * @param boundSeconds - The bound the run was allowed.
 * @returns The elapsed ms a run stopped at that bound reports at least.
 */
function atBoundMs(boundSeconds: number): number {
  return boundSeconds * 1000
}

/**
 * A runner's closing summary, printed only by a run that walked its whole suite: Hurl's
 * `Executed files:` block and the `N passed` / `N failed` / `N flaky` line Playwright and Vitest
 * print when they finish.
 *
 * This is what separates "stopped at the bound" from "used the bound and finished": a suite that
 * printed its summary ran to its end, and is read as the run it was.
 */
const SUITE_TALLY = /\bExecuted files:\s*\d+|\b\d+\s+(?:passed|failed|flaky|skipped)\b/

/**
 * Whether text carries a runner's closing summary ({@link SUITE_TALLY}).
 *
 * @param text - The run's stdout and stderr.
 * @returns True when the runner's own end-of-run summary is there.
 */
export function suiteTally(text: string): boolean {
  return SUITE_TALLY.test(text)
}

/** What stopped a run. */
export type CutBy = 'tool-budget' | 'command-timeout'

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
  /** How many files or tests the runner's own output shows finishing, or null when it shows none. */
  ran: number | null
  /** How many the run was walking, when the runner printed it (Playwright's `[n/K]`), or null. */
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
 * prints `[n/K]` with both numbers. Neither is inferred from the command — a run that printed
 * nothing says nothing, which is what `null` means here.
 *
 * @param text - The run's stdout and stderr.
 * @param suite - Whether the command runs a suite.
 * @returns How many finished, how many the run was walking, and the noun.
 */
function runProgress(text: string, suite: boolean): Pick<CutRun, 'ran' | 'total' | 'noun'> {
  const files = new Set<string>()
  for (const m of text.matchAll(HURL_FILE_LINE)) files.add(m[1] ?? '')
  if (files.size > 0) return { ran: files.size, total: null, noun: 'files' }
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
 * - `timeout`'s own 124 (the code the backend's wrapper returns whenever the TOOL's budget fired,
 *   whatever the pipeline ended with) — and, when the clock says the command's own smaller bound
 *   ran out first and less than the budget, that bound instead.
 * - the command carried its own `timeout <N>`, N is inside this tool's budget (a larger one never
 *   fires — the tool's does), the run used N, and no runner printed a closing summary: the run was
 *   killed at its own bound. Its exit code, when the pipeline handed one back, is the filter's.
 * - the run used this tool's whole budget behind a filter that withheld its output, and printed no
 *   closing summary: the budget stopped it, and no code in the result is the run's.
 *
 * @param command - The command the executor sent.
 * @param result - Its result.
 * @param elapsedMs - How long the command ran, in ms.
 * @param budgetSeconds - This tool's foreground budget, in seconds (0 when it has none).
 * @returns The stopped run, or null.
 */
export function commandCutRun(
  command: string,
  result: unknown,
  elapsedMs: number,
  budgetSeconds = 0,
): CutRun | null {
  if (typeof command !== 'string' || !command.trim()) return null
  if (result === null || typeof result !== 'object') return null
  if (!Number.isFinite(elapsedMs)) return null
  const r = result as { exitCode?: unknown; stdout?: unknown; stderr?: unknown }
  const exitCode = typeof r.exitCode === 'number' ? r.exitCode : null
  const text = `${String(r.stdout ?? '')}\n${String(r.stderr ?? '')}`
  // A suite that printed its summary ran to its end, whatever it was wrapped in.
  if (suiteTally(text)) return null
  const suite = isSuiteRunCommand(command)
  const withheld = /\|\s*(?:tail|head|grep|egrep|fgrep|sort|uniq|wc|jq)\b/.test(command)
  const progress = runProgress(text, suite)
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
 * The first line of a stopped run's result: how long it was allowed, what stopped it, how far it
 * got, and the last thing it printed.
 *
 * Written to be quotable by the model in one sentence and to leave no room for "nearly passing":
 * the counts come from the runner's own output ({@link runProgress}), and a `total` the caller
 * read elsewhere (the suite's own file count) fills in the "M of K" it can then state.
 *
 * @param run - The stopped run.
 * @returns The sentence.
 */
export function cutRunSentence(run: CutRun): string {
  const by =
    run.stoppedBy === 'tool-budget' ? "this tool's limit" : `its own \`timeout ${run.seconds}\``
  const lead = `This run was stopped after ${run.seconds}s (${by})`
  const count =
    run.ran !== null && run.total !== null
      ? `: ${run.ran} of ${run.total} ${run.noun} ran, the rest did not run`
      : run.ran !== null
        ? `: ${run.ran} ${run.noun} ran and the rest did not run`
        : ' before it finished'
  const doing = run.doing ? `; the last thing it was doing: ${run.doing}` : ''
  // Why the result carries no code: without this the model reads the missing field as an
  // omission, and the number it used to read there was the pipeline's own 0.
  const code =
    run.exitCode === null
      ? ' It has no exit code of its own to report — the one this pipeline produced belongs to the filter, not to the run.'
      : ''
  return `${lead}${count}${doing}.${code}`
}
