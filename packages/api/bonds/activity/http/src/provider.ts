/**
 * Generic HTTP activity sink.
 *
 * POSTs each captured {@link ActivityEvent} to a configured activity-ingest
 * endpoint so it can be persisted and fanned out by whatever backend the host
 * app runs. The endpoint is supplied by the consuming app — via the `url`
 * option or the `MOLECULE_ACTIVITY_URL` env var — and is NEVER assumed: when no
 * endpoint is configured the sink no-ops, so a host that bonds this provider
 * without an endpoint never silently phones home to a third party.
 *
 * When a runtime token (`MOLECULE_VAULT_TOKEN`) and/or app id
 * (`MOLECULE_APP_ID`) are configured, the request is bearer-authed and tagged
 * with the app id; otherwise those headers are omitted. Recording is
 * best-effort: a missing endpoint or a failed POST is logged and swallowed,
 * never thrown — a capture failure must not break the calling application.
 *
 * @module
 */

import type { ActivityEvent, ActivitySink } from '@molecule/api-activity'
import { logger } from '@molecule/api-logger'

/**
 * Options for the HTTP activity sink.
 */
export interface HttpActivitySinkOptions {
  /**
   * The activity endpoint URL. Falls back to the `MOLECULE_ACTIVITY_URL` env
   * var. There is no built-in default — when neither is set the sink no-ops, so
   * an unconfigured generic consumer never POSTs to an assumed destination.
   */
  url?: string

  /**
   * The app's runtime vault token, sent as a bearer token.
   * Defaults to the `MOLECULE_VAULT_TOKEN` env var.
   */
  token?: string

  /**
   * The app id for the configured endpoint, sent as the `X-Molecule-App-Id`
   * header (omitted when unset). Defaults to the `MOLECULE_APP_ID` env var.
   */
  appId?: string
}

/**
 * Creates an HTTP activity sink that POSTs each event to the configured ingest
 * endpoint.
 *
 * Best-effort: an unconfigured endpoint is skipped (debug-logged), and a failed
 * POST (or a thrown `fetch`) is caught and logged, never rethrown, so capture
 * providers can record unconditionally.
 *
 * @param options - Endpoint URL, runtime token, and app id. Each falls back to
 *   its corresponding `MOLECULE_*` env var, resolved per-request. With no URL
 *   configured the sink does nothing — it never assumes a destination.
 * @returns An {@link ActivitySink} backed by an HTTP POST.
 */
export function createHttpSink(options: HttpActivitySinkOptions = {}): ActivitySink {
  return {
    async record(event: ActivityEvent): Promise<void> {
      const url = options.url ?? process.env.MOLECULE_ACTIVITY_URL
      if (!url) {
        // A generic sink must never assume an ingest destination when
        // unconfigured — POSTing to a baked-in default would be silent activity
        // exfiltration. Best-effort contract: skip (debug-logged), never throw.
        logger.debug('[activity] no activity URL configured (MOLECULE_ACTIVITY_URL); skipping POST')
        return
      }
      const token = options.token ?? process.env.MOLECULE_VAULT_TOKEN
      const appId = options.appId ?? process.env.MOLECULE_APP_ID

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      if (appId) {
        headers['X-Molecule-App-Id'] = appId
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
        })

        if (!response.ok) {
          logger.warn(`[activity] POST ${url} failed: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        logger.warn('[activity] failed to POST activity event:', error)
      }
    },
  }
}

/** Default HTTP activity sink instance, configured from environment variables. */
export const provider: ActivitySink = createHttpSink()
