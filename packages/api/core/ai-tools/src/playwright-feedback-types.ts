/**
 * Native Playwright diagnosis while an app is being written.
 *
 * @module
 */
import type { PlaywrightReportStats } from './playwright-report.js'

/** A source file already read by the caller. Paths are absolute. */
export interface FeedbackSource {
  path: string
  content: string
}

/** One project spec, with its normal, locally targeted runner command. */
export interface FeedbackSpec extends FeedbackSource {
  command: string
  cwd: string
}

/** The inputs the host already knows; no suite discovery or vendor selection in the scheduler. */
export interface FeedbackProject {
  /** Base for relative source-change paths, already resolved by the host. */
  root?: string
  sources: FeedbackSource[]
  specs: FeedbackSpec[]
  /**
   * Complete, absolute roots/files of test definitions, config and selection inputs, when
   * the caller knows them. Writes there invalidate test identities as well as results.
   * Omit when unknown: writes to the spec itself still invalidate its native selection.
   */
  testRoots?: string[]
}

/** A native failure, never a static prediction or a completed-suite proof. */
export interface PlaywrightFeedbackFailure {
  spec: string
  line: number
  error: string
  /** The native runner's locator, assertion or timed-out browser operation, apart from redaction. */
  locator: string
  /** Native test identity, when the reporter provided one. */
  testId?: string
  /** Playwright's own failure-time accessibility snapshot, when recorded. */
  rendered?: string
  /** The paths that triggered this run. They do not establish a failure cause. */
  sourceFiles: string[]
}

/** A completed native test with a conservative source-freshness clock. */
interface FeedbackTestOutcome {
  /** Playwright TestCase.id, also used by its last-run record. */
  id: string
  status: 'passed' | 'failed' | 'skipped'
  /** Source revision certified by the scheduler, absent for an obsolete or untracked test. */
  revision?: number
  /**
   * Earliest possible test start on the host monotonic clock (`performance.now()`): dispatch plus the reporter's
   * monotonic time since onBegin. Runner startup makes this conservative; remote wall-clock
   * skew cannot make a test appear newer than a write it overlapped.
   */
  startedAfter: number
}

/**
 * A diagnosis of one spec file at one source revision. A pass is not whole-suite proof.
 * `skipped` means the runner completed and every selected test skipped itself (a spec's own
 * `test.skip(condition)`): nothing to verify in this environment, neither a pass nor an outage.
 */
export interface PlaywrightFeedbackResult {
  spec: string
  revision: number
  durationMs: number
  status: 'passed' | 'failed' | 'skipped' | 'unavailable' | 'cancelled'
  failures: PlaywrightFeedbackFailure[]
  /** Native counts for this one diagnostic selection, never whole-suite proof. */
  nativeStats?: PlaywrightReportStats
  reason?: string
  /** Native completed tests, including tests from a stopped file. */
  tests?: FeedbackTestOutcome[]
  /** This run’s native selection. Partial selections never replace a file’s full inventory. */
  selectedTests?: string[]
  /**
   * Playwright's own last-run record (`.last-run.json`: the ids of the tests that failed or did
   * not run) from a failed run, when the runner wrote one. A later checkpoint hands it back so
   * the runner re-runs only those tests (`--last-failed`). A `cancelled` run carries one in the
   * same shape naming only the tests it saw fail before it stopped, when there were any.
   */
  lastRun?: string
  /**
   * The ids of the tests a `cancelled` run saw pass before it stopped, in the same form as
   * {@link lastRun}'s. They leave the spec's known failures; tests it never reached stay as known.
   * A finished `last-failed` run names the tests it passed the same way.
   */
  passedTests?: string[]
  /**
   * Each outermost serial group (`test.describe.serial`, `describe.configure({ mode: 'serial' })`)
   * the run selected, by test id. Its tests depend on each other, so a record that names one of
   * them names all of them: `--last-failed` would otherwise run a later test without the ones it
   * needs. A record this run returns ({@link lastRun}) already does.
   */
  serialGroups?: string[][]
  /**
   * `last-failed` when the run selected only the tests an earlier run's record names. Its pass
   * clears those failures; on its own it never stands for the whole file.
   */
  selection?: 'last-failed'
}

/** Host operations for the same checkpoints in a CLI process or a remote sandbox. */
export interface PlaywrightFeedbackOptions {
  load: () => Promise<FeedbackProject>
  /**
   * Run one spec file for a checkpoint. Every call is explicit verification the caller is waiting
   * for: hosts run it with `runPlaywrightFeedback`'s `foreground`, unless the host process itself
   * runs beside other work (a CLI watcher), where it may yield to that work.
   */
  run: (
    spec: FeedbackSpec,
    sources: string[],
    revision: number,
    /** Receives native failures as they arrive; checkpoints read the returned result instead. */
    emit: (result: PlaywrightFeedbackResult) => void,
    /** Stop the owned native process group when cancelled; never wait for the tests to finish. */
    signal: AbortSignal,
    /**
     * The spec's known failures in the last-run shape, on a known-failures checkpoint. Hand it to
     * `runPlaywrightFeedback` as `lastFailed` so only those tests run; a host that ignores it
     * runs the whole file.
     */
    lastRun?: string,
  ) => Promise<PlaywrightFeedbackResult>
  /** Every native result a checkpoint ran, as operational state apart from defect feedback. */
  onResult?: (result: PlaywrightFeedbackResult) => void
}

/** What an explicit checkpoint runs. */
export interface PlaywrightFeedbackCheckOptions {
  /**
   * Re-run only the spec files in {@link PlaywrightFeedback.failingSpecs}. With none, the
   * checkpoint loads and runs nothing and returns no results.
   * Within such a file only the tests its last failed run names are re-run, when the runner
   * recorded them; the whole file runs when it did not, or when that record selects no test.
   * Their pass clears the known failure; the rest of the file is left to explicit runs.
   */
  failedOnly?: boolean
}

/** Source-write tracking with explicit native checkpoints. Nothing runs on a write. */
export interface PlaywrightFeedback {
  /**
   * Record source writes: the revision advances and passes reused by checkpoints are dropped. A
   * write during a checkpoint interrupts it and discards its partial result.
   */
  changed: (paths: readonly string[]) => void
  /**
   * Verify the current revision before an explicit action, reusing completed native results.
   * Stops at the first failing or unavailable spec; a skipped spec does not stop it. A source
   * write interrupts the checkpoint and discards its partial result. Concurrent checkpoints share
   * the same work.
   */
  check: (options?: PlaywrightFeedbackCheckOptions) => Promise<PlaywrightFeedbackResult[]>
  /** Spec files whose latest native outcome failed and that have not passed or skipped since. */
  failingSpecs: () => string[]
  /**
   * The current source revision. Read it before starting a native run of your own and pass it to
   * {@link PlaywrightFeedback.record} with that run's outcomes.
   */
  revision: () => number
  /**
   * Record outcomes of a native run the host started itself (an explicit local test command with
   * the same spec command, or a deployed walk), so {@link PlaywrightFeedback.check} reuses them
   * instead of running the spec again. Ignored when a source write landed after `revision` was
   * read. Failures become known failures, with the runner's failed-test record, for the next
   * known-failures checkpoint to re-run. A pass or self-skip clears the known failure. Cancelled
   * and unavailable runs change nothing. Partial selections are diagnosis and never replace
   * whole-file checkpoint coverage.
   */
  record: (results: readonly PlaywrightFeedbackResult[], revision: number) => void
  /** Stop: a running checkpoint is cancelled and awaited, and later calls do nothing. */
  close: () => Promise<void>
}
