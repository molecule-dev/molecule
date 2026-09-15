/**
 * Pure state + grouping helpers for the {@link TestsBar}.
 *
 * Everything here is a plain function over plain data, so the bar's behaviour
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

/** Everything the bar knows about the run it is showing. */
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
  /** How the run ended, once it has. */
  outcome: TestRunOutcome | null
  /** A run-level failure message (timeout, transport error) shown in the bar. */
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
 * Deliberately total: an event for an id the bar no longer lists is recorded
 * anyway (a re-list may be in flight), and an unknown event type leaves the
 * state untouched rather than throwing inside a stream handler.
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
    case 'result': {
      return {
        ...state,
        results: {
          ...state.results,
          [event.id]: {
            status: event.status,
            ...(event.durationMs != null ? { durationMs: event.durationMs } : {}),
            passed: event.passed ?? 0,
            failed: event.failed ?? 0,
            skipped: event.skipped ?? 0,
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
 * The state after a run that never produced a `done` event — the host's stream
 * died, or its request failed before the server could answer.
 *
 * @param state - The current state.
 * @param message - What to show in the bar.
 * @returns The next state, no longer running.
 */
export function failRun(state: TestsRunState, message: string): TestsRunState {
  return { ...state, running: false, currentId: null, outcome: 'error', error: message }
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
 * Whether a written path is a test file, so the bar can re-list the moment the
 * agent writes a NEW spec instead of only on the next run or reload. Matches
 * the same `*.spec.*` / `*.test.*` shape the host's discovery looks for, so a
 * write that cannot change the list never costs a listing.
 *
 * @param path - The path that changed (absolute or workspace-relative).
 * @returns True when the path is a spec or test file.
 */
export function isTestFilePath(path: string): boolean {
  return /\.(spec|test)\.[cm]?[jt]sx?$/.test(path)
}
