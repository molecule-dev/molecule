/**
 * Pure state + grouping helpers for the {@link TestsCard}.
 *
 * Everything here is a plain function over plain data, so the card's behaviour
 * (which rows a group runs, how a streamed event moves the run forward, what
 * the collapsed summary says) is unit-testable without rendering anything.
 *
 * @module
 */

import type {
  TestItem,
  TestKind,
  TestRunEvent,
  TestRunOutcome,
  TestStatus,
  TestWorkspace,
} from '../types.js'

/** The one test a file is on right now, named the way its runner names it. */
export interface TestCaseRef {
  /** The runner's test title. */
  title: string
  /** Its enclosing group (`describe`), when it has one. */
  describe?: string
}

/**
 * What one FILE is doing while it runs: which test is on screen, and how its
 * own tests have gone so far. Discarded the moment the file reports a `result`
 * — the row's verdict pill takes over from there.
 */
export interface TestCaseProgress {
  /** The test running right now, or `null` between tests. */
  current: TestCaseRef | null
  passed: number
  failed: number
  skipped: number
}

/** One rendered group of rows: a kind within a project directory. */
export interface TestGroup {
  kind: TestKind
  workspace: TestWorkspace
  /** The directory's name for the heading; `null` for the workspace root. */
  label: string | null
  items: TestItem[]
}

/** What one test file ended as in the last run. */
export interface TestResultEntry {
  status: TestStatus
  durationMs?: number
  passed: number
  failed: number
  skipped: number
  /** The runner's output, kept for a FAILURE so the row can keep showing it. */
  output?: string
}

/** Everything the card knows about the run it is showing. */
export interface TestsRunState {
  runId: string | null
  running: boolean
  /** The ids this run covers, in run order. */
  queued: string[]
  /** The id whose output is streaming right now, when the host says which. */
  currentId: string | null
  /** The live output lines, newest last, capped at {@link MAX_OUTPUT_LINES}. */
  output: string[]
  /** Per-id outcome from this run (and from earlier runs, until re-run). */
  results: Record<string, TestResultEntry>
  /**
   * Per-id LIVE per-test progress, for the files that are running right now.
   * An entry exists only between a file's first `case` event and its `result`.
   */
  cases: Record<string, TestCaseProgress>
  /** A skip was asked for and the run has not answered it yet. */
  skipPending: boolean
  /**
   * Skipping is not on offer: the host wired no `skipCurrent`, or it answered
   * that there was nothing left to skip. The control is dropped — never
   * replaced by an error the person cannot act on.
   */
  skipUnavailable: boolean
  /** How the run ended, once it has. */
  outcome: TestRunOutcome | null
  /** A run-level failure message (timeout, transport error) shown in the card. */
  error: string | null
  startedAt: number | null
  durationMs: number | null
}

/** Live output lines retained — enough to read, bounded so a chatty run cannot grow forever. */
export const MAX_OUTPUT_LINES = 400

/** Display order of the kinds: the preview-driven specs lead, unit tests follow. */
const KIND_ORDER: readonly TestKind[] = ['e2e', 'unit']

/**
 * Display order of the project directories within a kind: by path, with the
 * workspace root (`.`) last — it is the least specific place a test can live.
 *
 * @param a - One directory.
 * @param b - The other.
 * @returns The sort order.
 */
function compareWorkspaces(a: TestWorkspace, b: TestWorkspace): number {
  if (a === b) return 0
  if (a === '.') return 1
  if (b === '.') return -1
  return a.localeCompare(b)
}

/**
 * The heading name for a directory: the host's label when it sent one, else
 * the path itself, and `null` for the root either way.
 *
 * @param item - Any test in the group.
 * @returns The label, or `null` for the workspace root.
 */
function labelFor(item: TestItem): string | null {
  if (item.workspaceLabel !== undefined) return item.workspaceLabel
  return item.workspace === '.' ? null : item.workspace
}

/** A run that has not started. */
export const EMPTY_RUN_STATE: TestsRunState = {
  runId: null,
  running: false,
  queued: [],
  currentId: null,
  output: [],
  results: {},
  cases: {},
  skipPending: false,
  // Nothing is running, so there is nothing to skip. The panel turns this off
  // when it starts a run on a host whose handle implements `skipCurrent`.
  skipUnavailable: true,
  outcome: null,
  error: null,
  startedAt: null,
  durationMs: null,
}

/**
 * Group tests for display: by kind (end-to-end first), then by project
 * directory (whatever directories are present — `app`, `my-app/app`,
 * `packages/web`, the root last), with the files sorted inside each group.
 *
 * @param tests - Every discovered test.
 * @returns The groups, in display order. Empty groups are never produced.
 */
export function groupTests(tests: readonly TestItem[]): TestGroup[] {
  const groups: TestGroup[] = []
  for (const kind of KIND_ORDER) {
    const workspaces = [
      ...new Set(tests.filter((t) => t.kind === kind).map((t) => t.workspace)),
    ].sort(compareWorkspaces)
    for (const workspace of workspaces) {
      const items = tests
        .filter((t) => t.kind === kind && t.workspace === workspace)
        .slice()
        .sort((a, b) => a.file.localeCompare(b.file))
      if (items.length > 0) groups.push({ kind, workspace, label: labelFor(items[0]!), items })
    }
  }
  return groups
}

/**
 * How many tests there are of each kind.
 *
 * @param tests - Every discovered test.
 * @returns The per-kind counts.
 */
export function countByKind(tests: readonly TestItem[]): Record<TestKind, number> {
  return {
    e2e: tests.filter((t) => t.kind === 'e2e').length,
    unit: tests.filter((t) => t.kind === 'unit').length,
  }
}

/**
 * The tallies of the last run, over the tests that are still listed. Counted
 * per FILE (one row, one verdict) so the collapsed summary matches the rows.
 *
 * @param tests - The currently listed tests.
 * @param results - The per-id outcomes.
 * @returns Passed/failed/skipped file counts.
 */
export function summarizeResults(
  tests: readonly TestItem[],
  results: Record<string, TestResultEntry>,
): { passed: number; failed: number; skipped: number; reported: number } {
  let passed = 0
  let failed = 0
  let skipped = 0
  for (const test of tests) {
    const entry = results[test.id]
    if (!entry) continue
    if (entry.status === 'passed') passed += 1
    else if (entry.status === 'failed') failed += 1
    else skipped += 1
  }
  return { passed, failed, skipped, reported: passed + failed + skipped }
}

/**
 * Fold one streamed event into the run state.
 *
 * Deliberately total: an event for an id the card no longer lists is recorded
 * anyway (a re-list may be in flight), a `case` that arrives out of order (after
 * its file already reported a verdict) is dropped rather than resurrecting a
 * finished row, and an unknown event type leaves the state untouched rather
 * than throwing inside a stream handler.
 *
 * @param state - The current state.
 * @param event - The event just received.
 * @returns The next state (a new object whenever anything changed).
 */
export function applyTestRunEvent(state: TestsRunState, event: TestRunEvent): TestsRunState {
  switch (event.type) {
    case 'start': {
      // A new run clears the previous run's verdicts for the ids it covers, so
      // a stale green pill never sits next to a row that is running again.
      const results = { ...state.results }
      for (const id of event.ids) delete results[id]
      return {
        ...state,
        runId: event.runId,
        running: true,
        queued: [...event.ids],
        currentId: null,
        output: [],
        results,
        cases: {},
        skipPending: false,
        // NOT reset: whether the host can skip at all is the panel's to say,
        // and it says so when it creates the handle — before this arrives.
        outcome: null,
        error: null,
        startedAt: Date.now(),
        durationMs: null,
      }
    }
    case 'output': {
      const output = [...state.output, ...event.chunk.split('\n')]
      return {
        ...state,
        currentId: event.id ?? state.currentId,
        output: output.length > MAX_OUTPUT_LINES ? output.slice(-MAX_OUTPUT_LINES) : output,
      }
    }
    case 'case': {
      // Out of order: this file already has this run's verdict, so its per-test
      // detail is gone and `isRowRunning` must not be told otherwise.
      if (state.results[event.id]) return state
      const previous = state.cases[event.id] ?? {
        current: null,
        passed: 0,
        failed: 0,
        skipped: 0,
      }
      const next: TestCaseProgress =
        event.status === 'running'
          ? {
              ...previous,
              current: {
                title: event.title,
                ...(event.describe ? { describe: event.describe } : {}),
              },
            }
          : {
              passed: previous.passed + (event.status === 'passed' ? 1 : 0),
              failed: previous.failed + (event.status === 'failed' ? 1 : 0),
              skipped: previous.skipped + (event.status === 'skipped' ? 1 : 0),
              // Clear the "now running" line only when THIS is the test it
              // named — a parallel runner can finish a different one first.
              current:
                previous.current && previous.current.title === event.title
                  ? null
                  : previous.current,
            }
      return { ...state, currentId: event.id, cases: { ...state.cases, [event.id]: next } }
    }
    case 'result': {
      // The file is done: its live per-test detail collapses and the row's
      // verdict pill takes over. A count the event omits falls back to what the
      // per-test stream already counted, rather than silently reading as zero.
      const cases = { ...state.cases }
      const progress = cases[event.id]
      delete cases[event.id]
      return {
        ...state,
        cases,
        // Whatever the verdict, the run answered — the Skip the person asked
        // for has either landed or been overtaken.
        skipPending: false,
        results: {
          ...state.results,
          [event.id]: {
            status: event.status,
            ...(event.durationMs != null ? { durationMs: event.durationMs } : {}),
            passed: event.passed ?? progress?.passed ?? 0,
            failed: event.failed ?? progress?.failed ?? 0,
            skipped: event.skipped ?? progress?.skipped ?? 0,
            ...(event.output ? { output: event.output } : {}),
          },
        },
      }
    }
    case 'done': {
      return {
        ...state,
        running: false,
        currentId: null,
        cases: {},
        skipPending: false,
        outcome: event.outcome,
        error: event.error ?? null,
        durationMs: event.durationMs ?? (state.startedAt ? Date.now() - state.startedAt : null),
      }
    }
    default:
      return state
  }
}

/**
 * Record that the person asked to skip what is running. The state only says a
 * request is OUT — the run's own `result` for the skipped file is what actually
 * moves the row, so nothing here can make a skipped file read as anything else.
 *
 * @param state - The current state.
 * @returns The next state, or the same one when there is nothing to skip.
 */
export function requestSkip(state: TestsRunState): TestsRunState {
  if (!state.running || state.skipPending || state.skipUnavailable) return state
  return { ...state, skipPending: true }
}

/**
 * Record that skipping is not on offer — either the host wired no `skipCurrent`
 * or it answered that the run had already moved on. The control is dropped; the
 * person is not shown an error about a race they did not cause.
 *
 * @param state - The current state.
 * @returns The next state.
 */
export function markSkipUnavailable(state: TestsRunState): TestsRunState {
  return { ...state, skipPending: false, skipUnavailable: true }
}

/**
 * Whether the host can be asked to skip right now.
 *
 * @param state - The run state.
 * @returns True when a Skip control belongs on screen.
 */
export function canSkipRun(state: TestsRunState): boolean {
  return state.running && !state.skipUnavailable
}

/**
 * Which row the Skip acts on: the one the stream named as current, or — when it
 * has not named one yet — the single row still awaiting a verdict, because with
 * exactly one candidate there is nothing to be ambiguous about.
 *
 * @param state - The run state.
 * @returns The row's id, or `null` when the run is not on an identifiable row.
 */
export function currentRunRowId(state: TestsRunState): string | null {
  if (!state.running) return null
  if (state.currentId) return state.currentId
  const pending = state.queued.filter((id) => state.results[id] == null)
  return pending.length === 1 ? (pending[0] as string) : null
}

/**
 * The one-line name of the test a file is on: its group and its title, or just
 * its title when the runner gave it no group.
 *
 * @param current - The running test, or `null`.
 * @returns The label, or `` when nothing is named.
 */
export function testCaseLabel(current: TestCaseRef | null | undefined): string {
  if (!current) return ''
  const title = current.title.trim()
  const describe = current.describe?.trim()
  if (!title) return describe ?? ''
  return describe ? `${describe} › ${title}` : title
}

/**
 * The state after a run that never produced a `done` event — the host's stream
 * died, or its request failed before the server could answer.
 *
 * @param state - The current state.
 * @param message - What to show in the card.
 * @returns The next state, no longer running.
 */
export function failRun(state: TestsRunState, message: string): TestsRunState {
  return {
    ...state,
    running: false,
    currentId: null,
    cases: {},
    skipPending: false,
    skipUnavailable: true,
    outcome: 'error',
    error: message,
  }
}

/**
 * Whether a row should render as "running": the run is live and either the host
 * named this row as current, or it is in the queue and has no verdict yet.
 *
 * @param state - The run state.
 * @param id - The row's test id.
 * @returns True when the row is part of the live run and still undecided.
 */
export function isRowRunning(state: TestsRunState, id: string): boolean {
  if (!state.running) return false
  if (state.currentId === id) return true
  return state.queued.includes(id) && state.results[id] == null
}

/**
 * The label for a row: the host's title when it gave one, else the file path.
 *
 * @param item - The test.
 * @returns The label to render.
 */
export function testRowLabel(item: TestItem): string {
  return item.title?.trim() || item.file
}

/**
 * Filters tests by a free-text query, matching (case-insensitively) against the
 * file path, the row title, and the project directory. A blank query returns
 * every test in input order — the same contract as `filterScripts`.
 *
 * @param tests - The tests to filter.
 * @param query - The search query.
 * @returns The matching tests, in input order.
 */
export function filterTests(tests: readonly TestItem[], query: string): TestItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...tests]
  return tests.filter(
    (t) =>
      t.file.toLowerCase().includes(q) ||
      (t.title ?? '').toLowerCase().includes(q) ||
      String(t.workspace).toLowerCase().includes(q),
  )
}

/**
 * Parses a `/test [query | all]` command (`/tests` is the registered alias).
 *
 * `all` is the one argument that ACTS: it runs everything immediately. Every
 * other argument only filters the list, exactly the way `/scripts <query>` seeds
 * the scripts browser — running ONE test by name is what the per-row Run button
 * is for, and giving the argument a second meaning would make `/test <thing>`
 * sometimes list and sometimes execute.
 *
 * @param input - The raw chat input.
 * @returns `{ query, runAll }` when it is a `/test` command, else `null`.
 */
export function parseTestCommand(input: string): { query: string; runAll: boolean } | null {
  const match = input.trim().match(/^\/tests?(?:\s+(.*))?$/i)
  if (!match) return null
  const argument = (match[1] ?? '').trim()
  if (argument.toLowerCase() === 'all') return { query: '', runAll: true }
  return { query: argument, runAll: false }
}

/** Output kept per failure when several are batched into one fix message. */
export const MAX_FIX_OUTPUT_CHARS = 2_000

/** Total output kept across a batched fix message, so one click cannot send a novel. */
export const MAX_FIX_MESSAGE_OUTPUT_CHARS = 12_000

/**
 * Keep the LAST `max` characters — a runner failure’s useful part is its tail
 * (the assertion and its stack), never its head.
 *
 * @param text - The output.
 * @param max - The budget.
 * @returns The tail, marked when it was cut.
 */
function tail(text: string, max: number): string {
  const trimmed = text.trimEnd()
  if (trimmed.length <= max) return trimmed
  return `…(earlier output trimmed)\n${trimmed.slice(-max)}`
}

/** One failing test and the output that explains it. */
export interface TestFailure {
  item: TestItem
  output?: string | undefined
}

/**
 * Compose the ONE user message the card's “Fix with Synthase” action sends.
 *
 * It is a real turn the executor answers, so it reads like something a person
 * would type: which test failed, where it lives, what the runner said, and to
 * re-run it. This is a PROMPT, not UI copy — it is not translated, exactly like
 * the auto-fix loop’s own `Fix these issues:` message.
 *
 * @param failures - The failing tests, in the order the card lists them.
 * @returns The message, or `` when there is nothing to fix.
 */
export function buildTestFixMessage(failures: readonly TestFailure[]): string {
  if (failures.length === 0) return ''
  const perFailure = failures.length === 1 ? MAX_FIX_MESSAGE_OUTPUT_CHARS : MAX_FIX_OUTPUT_CHARS
  let budget = MAX_FIX_MESSAGE_OUTPUT_CHARS
  const where = (item: TestItem): string => (item.workspaceLabel ? ` (${item.workspaceLabel})` : '')
  const block = (failure: TestFailure): string => {
    const raw = (failure.output ?? '').trim()
    if (!raw || budget <= 0) return ''
    const kept = tail(raw, Math.min(perFailure, budget))
    budget -= kept.length
    return `\n\n\`\`\`\n${kept}\n\`\`\``
  }
  if (failures.length === 1) {
    const only = failures[0] as TestFailure
    return (
      `Fix the failing test \`${only.item.file}\`${where(only.item)}.` +
      block(only) +
      '\n\nRe-run it with /test when you are done.'
    )
  }
  const parts = failures.map(
    (failure) => `\`${failure.item.file}\`${where(failure.item)}:${block(failure)}`,
  )
  return (
    `Fix these ${failures.length} failing tests.\n\n${parts.join('\n\n')}` +
    '\n\nRe-run them with /test when you are done.'
  )
}

/**
 * Every listed test whose last verdict was a failure, with its output — what
 * the card's fix actions send.
 *
 * @param tests - The currently listed (and filtered) tests.
 * @param results - The per-id outcomes.
 * @returns The failures, in list order.
 */
export function failedTests(
  tests: readonly TestItem[],
  results: Record<string, TestResultEntry>,
): TestFailure[] {
  const failures: TestFailure[] = []
  for (const item of tests) {
    const entry = results[item.id]
    if (entry?.status !== 'failed') continue
    failures.push({ item, output: entry.output })
  }
  return failures
}
