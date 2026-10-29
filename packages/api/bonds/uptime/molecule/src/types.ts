/**
 * Configuration for the molecule.dev hosted uptime provider.
 *
 * @module
 */

/** Options for `createProvider()`. Every field falls back to its env var. */
export interface MoleculeUptimeConfig {
  /**
   * A molecule project API key (`mk_…`) or the in-sandbox token (`mbk_…`),
   * scope `broker` or `broker:uptime`. Defaults to
   * `process.env.MOLECULE_API_KEY`.
   */
  apiKey?: string

  /**
   * The hosted services base URL. Defaults to
   * `process.env.MOLECULE_SERVICES_URL`, then
   * `https://api.molecule.dev/api/v1/services`.
   */
  servicesUrl?: string

  /** Per-call HTTP timeout in milliseconds. Defaults to `45_000` — the probe's own `timeoutMs` (at most 30,000) plus redirect and network slack. */
  timeoutMs?: number
}

/**
 * One scheduled monitor: a probe spec the platform runs on an interval from
 * molecule.dev, with its latest verdict and schedule state. The push
 * subscription keys are never returned.
 */
export interface UptimeMonitorView {
  id: string
  url: string
  /** The validated probe spec the platform executes (url, method, timeoutMs, expectStatus, expectText, degradedLatencyMs). */
  spec: {
    url: string
    method?: 'GET' | 'HEAD'
    timeoutMs?: number
    expectStatus?: number
    expectText?: string
    degradedLatencyMs?: number
  }
  intervalSeconds: number
  /** Whether a web-push subscription is attached for down/recovery alerts. */
  alerting: boolean
  paused: boolean
  lastStatus: 'operational' | 'degraded' | 'down' | null
  lastCheckedAt: string | null
  nextRunAt: string
  consecutiveFails: number
  lastAlertAt: string | null
  createdAt: string
}

/** What `scheduleMonitor()` accepts: the probe spec plus the schedule. */
export interface ScheduleMonitorInput {
  /** Update an existing monitor instead of creating one (every field resupplied; execution state resets). */
  id?: string
  url: string
  /** Whole seconds between runs: 60–86,400. */
  intervalSeconds: number
  method?: 'GET' | 'HEAD'
  timeoutMs?: number
  expectStatus?: number
  expectText?: string
  degradedLatencyMs?: number
  /** A browser push subscription created with molecule.dev's VAPID key (from `push/vapid-key`); attach or replace down/recovery alerting. `null` removes it. */
  alertPush?: { endpoint: string; keys: { p256dh: string; auth: string } } | null
  paused?: boolean
}

/** One stored check of a scheduled monitor. */
export interface UptimeCheckView {
  checkedAt: string
  status: 'operational' | 'degraded' | 'down'
  latencyMs: number | null
  httpStatus: number | null
  message: string | null
}
