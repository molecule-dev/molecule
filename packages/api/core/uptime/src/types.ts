/**
 * Type definitions for the uptime core interface.
 * @module
 */

/** Availability verdict for one probe. */
export type UptimeStatus = 'operational' | 'degraded' | 'down'

/** How to request the target. `HEAD` cannot carry `expectText` (no body). */
export type UptimeMethod = 'GET' | 'HEAD'

/**
 * The TLS certificate of the final hop's connection (https only).
 */
export interface UptimeTlsInfo {
  /** Certificate subject common name, when present. */
  subject?: string
  /** Issuing certificate authority's organization, when present. */
  issuer?: string
  /** Not-after date, ISO 8601. */
  validTo: string
  /** Whole days from the probe until `validTo` (negative when already expired). */
  daysRemaining: number
}

/**
 * One uptime probe: request a URL from the provider's vantage point and
 * judge the answer. The spec is the whole contract — everything is optional
 * except `url`, and every field is validated before any connection.
 */
export interface UptimeProbeSpec {
  /** The target, absolute `http:`/`https:`, at most 2,048 characters. */
  url: string

  /** `GET` (default) or `HEAD`. `HEAD` cannot carry `expectText`. */
  method?: UptimeMethod

  /**
   * Milliseconds allowed for the WHOLE probe — every redirect hop, the body
   * read included (1,000–30,000; default 10,000). Exceeding it is `down`.
   */
  timeoutMs?: number

  /**
   * The status the target must return. When given, ONLY this status is
   * `operational` and any other is `down`; when absent, 2xx is `operational`,
   * 3xx `degraded` (the probe followed up to 3 redirects and still ended on
   * one), 4xx/5xx `down`.
   */
  expectStatus?: number

  /**
   * Text that must appear in the response body (GET only, first 1 MB).
   * Case-sensitive substring. Not found → `down`.
   */
  expectText?: string

  /**
   * A successful probe slower than this many milliseconds (0–30,000; default
   * 2,000) is `degraded` instead of `operational`.
   */
  degradedLatencyMs?: number
}

/**
 * The outcome of one probe. A `down` site is a SUCCESSFUL probe — the call
 * answered the question — so providers resolve with it instead of throwing;
 * a thrown error means the probe itself could not run.
 */
export interface UptimeProbeResult {
  /** The availability verdict. */
  status: UptimeStatus

  /** ISO 8601 timestamp of when the probe completed. */
  checkedAt: string

  /** The requested `url`. */
  url: string

  /** The `method` the probe used (its default, when the spec omitted it). */
  method?: UptimeMethod

  /** The URL after redirects, when the target redirected. */
  finalUrl?: string

  /** How many redirects were followed (0 when none). */
  redirects?: number

  /** The final response's HTTP status, when one arrived. */
  httpStatus?: number

  /** Whole milliseconds from probe start to the response being fully read. */
  latencyMs?: number

  /** The final hop's TLS certificate (https only). */
  tls?: UptimeTlsInfo

  /**
   * A few response headers of the final hop — `content-type`, `server`,
   * `content-length` and `location` only, when present.
   */
  headers?: Record<string, string>

  /** Response-body bytes actually read (capped; 0 for `HEAD`). */
  bodyBytesRead?: number

  /** When `expectText` was given: whether it appeared. */
  expectTextMatched?: boolean

  /** Human-readable reason for a `down`/`degraded` verdict. */
  message?: string
}

/**
 * Uptime provider interface. All uptime providers must implement this. Bond
 * packages (in-process fetch, molecule.dev hosted, …) provide concrete
 * implementations.
 */
export interface UptimeProvider {
  /**
   * Probes one URL and resolves with the verdict.
   *
   * @param spec - What to probe and how to judge it.
   * @returns The probe's outcome — `down` included.
   * @throws {Error} When the spec is invalid or the provider cannot probe.
   */
  probe(spec: UptimeProbeSpec): Promise<UptimeProbeResult>
}
