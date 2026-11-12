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
   * checkpoint loads and runs nothing and returns no results.
   */
  failedOnly?: boolean
}

/** A nonblocking source-change subscription. */
export interface PlaywrightFeedback {
  changed: (paths: readonly string[]) => void
  takeFailures: () => PlaywrightFeedbackResult[]
  /** Cancel speculation before foreground work. Release after that work; nested callers are safe. */
  pause: () => Promise<() => void>
  /**
   * Verify the current revision before an explicit action, reusing completed native results.
   * Stops at the first failing or unavailable spec; a skipped spec does not stop it. Source
   * writes still cancel stale results. Concurrent checkpoints share the same work.
   */
  check: (options?: PlaywrightFeedbackCheckOptions) => Promise<PlaywrightFeedbackResult[]>
  /** Spec files whose latest native outcome failed and that have not passed or skipped since. */
  failingSpecs: () => string[]
  /** Wait for speculative work in tests or shutdown. Use check for explicit verification. */
  settled: () => Promise<void>
  close: () => Promise<void>
}
