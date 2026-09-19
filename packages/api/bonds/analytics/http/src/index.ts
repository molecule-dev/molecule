/**
 * Generic HTTP analytics provider.
 *
 * POSTs each `track()` / `identify()` / `page()` call as a small JSON document
 * to a configured first-party endpoint (the `url` option or the
 * `MOLECULE_ANALYTICS_URL` env var). No endpoint is assumed — when none is
 * configured the provider no-ops, so an unconfigured consumer never silently
 * phones home. Every POST is best-effort: network failures are swallowed
 * (logged only via the optional `onError` hook), so telemetry can never break
 * the CLI or service emitting it.
 *
 * Built for first-party ingestion — molecule.dev's own tooling (the `mlcl`
 * CLI, the `molecule-mcp` server) uses this bond to emit usage telemetry into
 * the platform's existing analytics pipeline, dogfooding the same
 * `@molecule/api-analytics` interface scaffolded apps consume.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-analytics'
 * import { createHttpAnalyticsProvider } from '@molecule/api-analytics-http'
 *
 * setProvider(
 *   createHttpAnalyticsProvider({
 *     url: 'https://api.molecule.dev/v1/telemetry/cli',
 *     // Optional request tagging — defaults to 'unknown'.
 *     source: 'mlcl',
 *   }),
 * )
 * // track() now POSTs; failures are swallowed.
 * ```
 *
 * @remarks
 * Wire format — one JSON object per call:
 *
 * ```json
 * {
 *   "kind": "track",              // "track" | "identify" | "page" | "group"
 *   "source": "mlcl",             // the `source` option
 *   "sentAt": "2026-09-19T…",     // ISO timestamp
 *   "event": { /* the AnalyticsEvent / user / pageView as given *\/ }
 * }
 * ```
 *
 * The receiving endpoint is expected to validate and allowlist (never trust a
 * remote client's event names) — see molecule-dev's `/v1/telemetry/cli` route
 * for the reference implementation. POSTs carry a 5-second timeout; a slow or
 * dead endpoint costs at most one aborted request, never a hang.
 *
 * @module
 */

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/api-analytics'

/** Options for {@link createHttpAnalyticsProvider}. */
export interface HttpAnalyticsProviderOptions {
  /** Endpoint that receives the POSTs. Defaults to $MOLECULE_ANALYTICS_URL; no-op when neither is set. */
  url?: string
  /** Tag identifying the emitting tool ('mlcl', 'molecule-mcp', …). Defaults to 'unknown'. */
  source?: string
  /** Best-effort error observer (e.g. debug logging). Never throws. */
  onError?: (error: unknown) => void
  /** Abort emit after this many ms (default 5000). */
  timeoutMs?: number
}

interface WirePayload {
  kind: 'track' | 'identify' | 'page' | 'group'
  source: string
  sentAt: string
  event: unknown
}

/** POST one payload — best-effort, never throws (telemetry must never break the caller). */
async function emit(
  payload: WirePayload,
  url: string | undefined,
  timeoutMs: number,
  onError?: (error: unknown) => void,
): Promise<void> {
  if (!url) return
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      // 4xx/5xx: nothing useful to retry — surface to the observer and move on.
      if (!response.ok && onError)
        onError(new Error(`analytics endpoint responded ${response.status}`))
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    // Telemetry must never break the caller.
    onError?.(error)
  }
}

/** Build an HTTP analytics provider bound to the configured endpoint. */
export function createHttpAnalyticsProvider(
  options: HttpAnalyticsProviderOptions = {},
): AnalyticsProvider {
  const url = options.url ?? process.env.MOLECULE_ANALYTICS_URL
  const source = options.source ?? 'unknown'
  const timeoutMs = options.timeoutMs ?? 5_000
  const send = (kind: WirePayload['kind'], event: unknown): Promise<void> =>
    emit({ kind, source, sentAt: new Date().toISOString(), event }, url, timeoutMs, options.onError)

  return {
    async identify(user: AnalyticsUserProps): Promise<void> {
      await send('identify', user)
    },
    async track(event: AnalyticsEvent): Promise<void> {
      await send('track', event)
    },
    async page(pageView: AnalyticsPageView): Promise<void> {
      await send('page', pageView)
    },
    async group(groupId: string, traits?: Record<string, unknown>): Promise<void> {
      await send('group', { groupId, traits })
    },
  }
}
