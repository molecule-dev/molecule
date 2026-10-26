/**
 * Spec validation and verdict derivation — the pure half of the uptime
 * contract, shared by every bond so a probe means the same thing everywhere
 * (in-process, molecule.dev hosted, the hosted handler's own bounds).
 *
 * @module
 */

import type { UptimeMethod, UptimeProbeSpec, UptimeStatus } from './types.js'

/** Per-probe limits — mirrored by the hosted handler, the render machine and the `-molecule` bond. */
export const UPTIME_LIMITS = {
  maxUrlChars: 2048,
  minTimeoutMs: 1000,
  maxTimeoutMs: 30_000,
  defaultTimeoutMs: 10_000,
  maxExpectTextChars: 256,
  defaultDegradedLatencyMs: 2000,
  maxDegradedLatencyMs: 30_000,
  maxRedirects: 3,
  /** Response-body bytes read before the read stops (the `expectText` window). */
  maxBodyBytes: 1_000_000,
} as const

/** The spec after validation: every optional field at its default. */
export type NormalizedUptimeProbeSpec = Required<
  Pick<UptimeProbeSpec, 'url' | 'method' | 'timeoutMs' | 'degradedLatencyMs'>
> &
  Pick<UptimeProbeSpec, 'expectStatus' | 'expectText'>

/**
 * Validates a probe spec field by field. Unknown fields are IGNORED (the
 * caller passes plain objects from JSON; extra keys carry no meaning here),
 * wrong-typed known fields are refused — the hosted path rebuilds its body
 * field by field upstream of this, so a smuggled provider option has no
 * route in.
 *
 * @param raw - The untrusted spec.
 * @returns The normalized spec, or the refusal message.
 */
export function validateProbeSpec(
  raw: unknown,
): { ok: true; spec: NormalizedUptimeProbeSpec } | { ok: false; message: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: '"spec" must be an object with a "url".' }
  }
  const s = raw as Record<string, unknown>

  if (typeof s.url !== 'string' || s.url.length === 0 || s.url.length > UPTIME_LIMITS.maxUrlChars) {
    return {
      ok: false,
      message: `"url" must be 1-${UPTIME_LIMITS.maxUrlChars} characters.`,
    }
  }
  let parsed: URL
  try {
    parsed = new URL(s.url)
  } catch (_error) {
    return { ok: false, message: '"url" must be an absolute http(s) URL.' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: '"url" must be an absolute http(s) URL.' }
  }

  let method: UptimeMethod = 'GET'
  if (s.method !== undefined) {
    if (s.method !== 'GET' && s.method !== 'HEAD') {
      return { ok: false, message: '"method" must be "GET" or "HEAD".' }
    }
    method = s.method
  }

  let timeoutMs: number = UPTIME_LIMITS.defaultTimeoutMs
  if (s.timeoutMs !== undefined) {
    if (
      typeof s.timeoutMs !== 'number' ||
      !Number.isInteger(s.timeoutMs) ||
      s.timeoutMs < UPTIME_LIMITS.minTimeoutMs ||
      s.timeoutMs > UPTIME_LIMITS.maxTimeoutMs
    ) {
      return {
        ok: false,
        message: `"timeoutMs" must be an integer from ${UPTIME_LIMITS.minTimeoutMs} to ${UPTIME_LIMITS.maxTimeoutMs}.`,
      }
    }
    timeoutMs = s.timeoutMs
  }

  let expectStatus: number | undefined
  if (s.expectStatus !== undefined) {
    if (
      typeof s.expectStatus !== 'number' ||
      !Number.isInteger(s.expectStatus) ||
      s.expectStatus < 100 ||
      s.expectStatus > 599
    ) {
      return { ok: false, message: '"expectStatus" must be an integer from 100 to 599.' }
    }
    expectStatus = s.expectStatus
  }

  let expectText: string | undefined
  if (s.expectText !== undefined) {
    if (
      typeof s.expectText !== 'string' ||
      s.expectText.length === 0 ||
      s.expectText.length > UPTIME_LIMITS.maxExpectTextChars
    ) {
      return {
        ok: false,
        message: `"expectText" must be 1-${UPTIME_LIMITS.maxExpectTextChars} characters.`,
      }
    }
    if (method === 'HEAD') {
      return { ok: false, message: '"expectText" needs the body — HEAD carries none; use GET.' }
    }
    expectText = s.expectText
  }

  let degradedLatencyMs: number = UPTIME_LIMITS.defaultDegradedLatencyMs
  if (s.degradedLatencyMs !== undefined) {
    if (
      typeof s.degradedLatencyMs !== 'number' ||
      !Number.isInteger(s.degradedLatencyMs) ||
      s.degradedLatencyMs < 0 ||
      s.degradedLatencyMs > UPTIME_LIMITS.maxDegradedLatencyMs
    ) {
      return {
        ok: false,
        message: `"degradedLatencyMs" must be an integer from 0 to ${UPTIME_LIMITS.maxDegradedLatencyMs}.`,
      }
    }
    degradedLatencyMs = s.degradedLatencyMs
  }

  return {
    ok: true,
    spec: {
      url: s.url,
      method,
      timeoutMs,
      expectStatus,
      expectText,
      degradedLatencyMs,
    },
  }
}

/** The observed facts one hop left behind — the input to {@link deriveProbeStatus}. */
export interface ProbeObservation {
  /** Connection/DNS/TLS/timeout failure text, when the probe never got a response. */
  failure?: string
  /** The final response's HTTP status, when one arrived. */
  httpStatus?: number
  /** Whether `expectText` appeared (only when the spec carried it). */
  expectTextMatched?: boolean
  /** Whole milliseconds the probe took. */
  latencyMs?: number
}

/**
 * Derives the verdict from the observation — the SAME rules for every bond:
 *
 * - a failure (no response at all) is `down`;
 * - `expectStatus`, when given, is the whole verdict: only it is
 *   `operational`;
 * - otherwise 2xx is `operational`, 3xx `degraded` (the redirect chain ended
 *   on a redirect — a loop, or more hops than {@link UPTIME_LIMITS.maxRedirects}),
 *   4xx/5xx `down`;
 * - `expectText` given but absent from the body is `down` (the page loaded
 *   but is not the page the caller wanted — the classic "up but serving an
 *   error shell" false-positive uptime checks exist to catch);
 * - an `operational` verdict slower than `degradedLatencyMs` degrades.
 *
 * @param observation - What the probe saw.
 * @param spec - The normalized spec the probe ran.
 * @returns The verdict and, for non-operational ones, the reason.
 */
export function deriveProbeStatus(
  observation: ProbeObservation,
  spec: NormalizedUptimeProbeSpec,
): { status: UptimeStatus; message?: string } {
  if (observation.failure !== undefined) {
    return { status: 'down', message: observation.failure }
  }
  const { httpStatus } = observation
  if (httpStatus === undefined) {
    return { status: 'down', message: 'No response arrived.' }
  }

  let status: UptimeStatus
  let message: string | undefined
  if (spec.expectStatus !== undefined) {
    if (httpStatus === spec.expectStatus) {
      status = 'operational'
    } else {
      status = 'down'
      message = `"expectStatus" wanted ${spec.expectStatus}, got ${httpStatus}.`
    }
  } else if (httpStatus >= 200 && httpStatus <= 299) {
    status = 'operational'
  } else if (httpStatus >= 300 && httpStatus <= 399) {
    status = 'degraded'
    message = `Ended on a redirect status (${httpStatus}).`
  } else {
    status = 'down'
    message = `HTTP ${httpStatus}.`
  }

  if (spec.expectText !== undefined && observation.expectTextMatched === false) {
    return {
      status: 'down',
      message: `"expectText" not found in the first ${UPTIME_LIMITS.maxBodyBytes} bytes${message ? ` — ${message}` : ''}.`,
    }
  }

  if (
    status === 'operational' &&
    observation.latencyMs !== undefined &&
    observation.latencyMs > spec.degradedLatencyMs
  ) {
    return {
      status: 'degraded',
      message: `Responded in ${observation.latencyMs}ms (degraded threshold ${spec.degradedLatencyMs}ms).`,
    }
  }

  return { status, message }
}
