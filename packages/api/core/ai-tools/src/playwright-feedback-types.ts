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
}

/** A native failure, never a static prediction or a completed-suite proof. */
export interface PlaywrightFeedbackFailure {
  spec: string
  line: number
  error: string
  /** The native runner's locator, assertion or timed-out browser operation, apart from redaction. */
  locator: string
  /** Playwright's own failure-time accessibility snapshot, when recorded. */
  rendered?: string
  /** The paths that triggered this run. They do not establish a failure cause. */
  sourceFiles: string[]
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
  /**
   * Playwright's own last-run record (`.last-run.json`: the ids of the tests that failed or did
   * not run) from a failed run, when the runner wrote one. A later checkpoint hands it back so
   * the runner re-runs only those tests (`--last-failed`).
   */
  lastRun?: string
  /**
   * `last-failed` when the run selected only the tests an earlier run's record names. Its pass
   * clears those failures; it never stands for the whole file.
   */
  selection?: 'last-failed'
}

/** Host operations for the same scheduler in a CLI process or a remote sandbox. */
export interface PlaywrightFeedbackOptions {
  load: () => Promise<FeedbackProject>
  run: (
    spec: FeedbackSpec,
    sources: string[],
    revision: number,
    emit: (result: PlaywrightFeedbackResult) => void,
    /** Stop the owned native process group when cancelled; never wait for the tests to finish. */
    signal: AbortSignal,
    /** A checkpoint is explicit verification and must not yield to its caller's deploy/build. */
    mode?: 'background' | 'foreground',
    /**
     * The spec's last failed run record ({@link PlaywrightFeedbackResult.lastRun}), passed on a
     * known-failures checkpoint. Hand it to `runPlaywrightFeedback` as `lastFailed` so only
     * those tests run; a host that ignores it runs the whole file, as before.
     */
    lastRun?: string,
  ) => Promise<PlaywrightFeedbackResult>
  /** Only current native failures are delivered. Passing apps receive no note. */
  onFailures?: (result: PlaywrightFeedbackResult) => void
  /** Operational state is separate from defect feedback. */
  onResult?: (result: PlaywrightFeedbackResult) => void
  debounceMs?: number
}

/** What an explicit checkpoint runs. */
export interface PlaywrightFeedbackCheckOptions {
  /**
   * Re-run only the spec files in {@link PlaywrightFeedback.failingSpecs}. With none, the
   * checkpoint loads and runs nothing and returns no results. Pending background diagnosis
   * of the other files resumes after foreground work releases its pause.
   * Within such a file only the tests its last failed run names are re-run, when the runner
   * recorded them; the whole file runs when it did not, or when that record selects no test.
   * Their pass clears the known failure; the rest of the file goes back to background diagnosis.
   */
  failedOnly?: boolean
}

/** A nonblocking source-change subscription. */
export interface PlaywrightFeedback {
  /**
   * Record source writes. A background spec already running finishes; its outcome still updates
   * {@link PlaywrightFeedback.failingSpecs}, but only a run with no write during it is reported.
   */
  changed: (paths: readonly string[]) => void
  takeFailures: () => PlaywrightFeedbackResult[]
  /** Cancel speculation before foreground work. Release after that work; nested callers are safe. */
  pause: () => Promise<() => void>
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
   * the same spec command), so {@link PlaywrightFeedback.check} reuses them instead of running the
   * spec again. Ignored when a source write landed after `revision` was read. Only a whole-file
   * pass or self-skip is recorded: it clears that spec's known failure exactly as a background
   * pass does. Any other outcome changes nothing.
   */
  record: (results: readonly PlaywrightFeedbackResult[], revision: number) => void
  /** Wait for speculative work in tests or shutdown. Use check for explicit verification. */
  settled: () => Promise<void>
  close: () => Promise<void>
}
