/**
 * The tests status bar — its visibility preference and the pure summary the bar
 * renders. The component is `TestStatusBar.tsx`; the hook is
 * `hooks/useTestsBarVisible.ts`.
 *
 * Visibility is a PER-DEVICE, per-user display preference in localStorage, the
 * same shape as `/timestamps` and `/sounds` — never project settings, so a
 * viewer can hide the bar without changing what a teammate sees. It defaults to
 * SHOWN: a run drives the project's preview as it goes, and a preview that moves
 * on its own with nothing on screen to explain it is the problem this bar
 * exists to remove.
 *
 * Shown, however, still means "once the project HAS tests" — see
 * {@link shouldShowTestsBar}. The preference decides whether the person wants
 * the bar; that predicate decides whether there is anything for it to say.
 *
 * @module
 */

import type { TestItem } from '../types.js'
import type { TestsRunState } from './tests-card-utilities.js'

/** localStorage key holding `'true'` / `'false'`. Absent = the default (shown). */
export const TESTS_BAR_STORAGE_KEY = 'mol_chat_show_tests_bar'

/** Window event dispatched (same tab) whenever the preference changes. */
export const TESTS_BAR_EVENT = 'mol:tests-bar-changed'

/**
 * Parses the stored preference. Only an explicit `'false'` hides the bar, so a
 * missing or unreadable value keeps the default (shown).
 *
 * @param raw - The raw localStorage value.
 * @returns Whether the tests bar is visible.
 */
export function parseTestsBarVisible(raw: string | null): boolean {
  return raw !== 'false'
}

/**
 * Reads this device's preference.
 *
 * @returns Whether the tests bar is visible (default `true`).
 */
export function getTestsBarVisible(): boolean {
  try {
    return parseTestsBarVisible(localStorage.getItem(TESTS_BAR_STORAGE_KEY))
  } catch (_error) {
    // localStorage unavailable (private mode, SSR) — fall back to the default.
    return true
  }
}

/**
 * Writes this device's preference and tells every mounted chat in this tab.
 *
 * @param visible - Whether the bar should be shown.
 */
export function setTestsBarVisible(visible: boolean): void {
  try {
    localStorage.setItem(TESTS_BAR_STORAGE_KEY, visible ? 'true' : 'false')
  } catch (_error) {
    // Unwritable storage still fires the event, so the current tab follows.
  }
  try {
    window.dispatchEvent(new CustomEvent(TESTS_BAR_EVENT, { detail: { visible } }))
  } catch (_error) {
    // No window (SSR) — nothing is mounted to notify.
  }
}

/**
 * What `/test on|off|toggle` means. Anything else is not a visibility request —
 * bare `/test` opens the tests browser, which is a different thing entirely.
 *
 * @param args - The text after `/test`.
 * @param current - The current visibility, for `toggle`.
 * @returns The requested visibility, or null when the argument is not one.
 */
export function parseTestsBarArg(args: string, current: boolean): boolean | null {
  const word = args.trim().toLowerCase()
  if (word === 'on' || word === 'show' || word === 'bar on') return true
  if (word === 'off' || word === 'hide' || word === 'bar off') return false
  if (word === 'toggle' || word === 'bar') return !current
  return null
}

/**
 * Whether there is anything for the bar to report.
 *
 * A project with no tests yet gets NO bar. The strip earns its slot above the
 * composer by accounting for something — a suite's verdict, a run driving the
 * preview — and a project that has not been given tests has neither; an empty
 * strip saying "0 tests not run yet" is noise in exactly the projects that are
 * least ready for it. It appears on its own the moment discovery finds a spec.
 *
 * The run clauses come second on purpose: a run in flight, a run-level error or
 * a finished outcome all mean tests EXIST, whatever the discovered list happens
 * to hold at that moment (a list can be empty because discovery has not
 * answered yet, not because the project is bare).
 *
 * @param run - The live run state.
 * @param tests - The discovered tests.
 * @returns Whether the bar should render at all.
 */
export function shouldShowTestsBar(run: TestsRunState, tests: TestItem[]): boolean {
  if (tests.length > 0) return true
  if (run.running || run.error != null || run.outcome != null) return true
  return Object.keys(run.results).length > 0
}

/** The bar's overall state, which decides its colour and its wording. */
export type TestsBarTone = 'idle' | 'running' | 'passing' | 'failing' | 'stopped' | 'error'

/** Everything the bar renders, derived from the run state in one place. */
export interface TestsBarSummary {
  tone: TestsBarTone
  /** Files that finished with every test passing. */
  passed: number
  /** Files that finished with at least one failing test. */
  failed: number
  /** Files that were skipped, by the runner or by the person. */
  skipped: number
  /** Files this run still has to reach, when it is running. */
  remaining: number
  /** Discovered files with no result yet — what the idle line counts. */
  notRun: number
  /** The file running right now, when the host says which. */
  currentFile: string | null
  /** The individual test running right now, when the runner names it. */
  currentTest: string | null
}

/**
 * Derive everything the bar shows from the run state.
 *
 * The tone is deliberately NOT "whatever the last file did": a single failing
 * file among twenty passing ones is a failing suite, because that is the thing
 * the person has to act on. Running always wins, since a count that is still
 * moving is not a verdict.
 *
 * @param run - The chat panel's live run state.
 * @param tests - The discovered tests, used to name the file running now.
 * @returns The summary the bar renders.
 */
export function summariseTestsBar(run: TestsRunState, tests: TestItem[]): TestsBarSummary {
  let passed = 0
  let failed = 0
  let skipped = 0
  for (const entry of Object.values(run.results)) {
    if (entry.status === 'passed') passed++
    else if (entry.status === 'failed') failed++
    else if (entry.status === 'skipped') skipped++
  }

  const byId = new Map(tests.map((test) => [test.id, test]))
  const current = run.currentId ? (byId.get(run.currentId) ?? null) : null
  const progress = run.currentId ? run.cases[run.currentId] : undefined
  const currentCase = progress?.current ?? null
  const currentTest = currentCase
    ? currentCase.describe
      ? `${currentCase.describe} › ${currentCase.title}`
      : currentCase.title
    : null

  const done = passed + failed + skipped
  const remaining = run.running ? Math.max(0, run.queued.length - done) : 0
  const notRun = tests.filter((test) => run.results[test.id] == null).length

  const tone: TestsBarTone = run.running
    ? 'running'
    : run.error
      ? 'error'
      : run.outcome === 'cancelled' || run.outcome === 'skipped-by-user'
        ? 'stopped'
        : failed > 0
          ? 'failing'
          : passed > 0
            ? 'passing'
            : 'idle'

  return {
    tone,
    passed,
    failed,
    skipped,
    remaining,
    notRun,
    currentFile: current?.title ?? current?.file ?? null,
    currentTest,
  }
}
