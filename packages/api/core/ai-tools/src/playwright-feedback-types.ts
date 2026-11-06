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

/** One supplied or scaffolded spec, with its normal, locally targeted runner command. */
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
  /** The native runner's locator or assertion, verbatim apart from redaction. */
  locator: string
  /** Playwright's own failure-time accessibility snapshot, when recorded. */
  rendered?: string
  /** Route render dependencies affected by this write, or the triggering source paths. */
  sourceFiles: string[]
}

/** A diagnosis of one spec file at one source revision. A pass is not whole-suite proof. */
export interface PlaywrightFeedbackResult {
  spec: string
  revision: number
  durationMs: number
  status: 'passed' | 'failed' | 'unavailable'
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
  ) => Promise<PlaywrightFeedbackResult>
  /** Only current native failures are delivered. Passing apps receive no note. */
  onFailures?: (result: PlaywrightFeedbackResult) => void
  /** Operational state is separate from defect feedback. */
  onResult?: (result: PlaywrightFeedbackResult) => void
  debounceMs?: number
}

/** A nonblocking source-change subscription. */
export interface PlaywrightFeedback {
  changed: (paths: readonly string[]) => void
  takeFailures: () => PlaywrightFeedbackResult[]
  /** Wait only in tests or shutdown; file writes and deploys must never await this. */
  settled: () => Promise<void>
  close: () => Promise<void>
}
