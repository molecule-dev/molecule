/**
 * HTTP activity sink for molecule.dev.
 *
 * POSTs each captured {@link ActivityEvent} to the molecule.dev activity
 * endpoint so it can be persisted per-project and fanned out over SSE to the
 * IDE Activity panel + Synthase chat. Used by sandboxed/managed apps that run
 * in a separate process from molecule.dev's API.
 *
 * The request is authed by the app's runtime vault token (reused, per
 * `docs/BAAS-activity.md` §4/§8 q1) and tagged with the app id. Recording is
 * best-effort: failures are caught and logged, never thrown — a capture
 * failure must not break the calling application.
 *
 * @module
 */

import type { ActivityEvent, ActivitySink } from '@molecule/api-activity'
import { logger } from '@molecule/api-logger'

const DEFAULT_ACTIVITY_URL = 'https://api.molecule.dev/v1/activity'

/**
 * Options for the HTTP activity sink.
 */
export interface HttpActivitySinkOptions {
  /**
   * The activity endpoint URL.
   * Defaults to `MOLECULE_ACTIVITY_URL` env var, then the molecule.dev endpoint.
   */
  url?: string

  /**
   * The app's runtime vault token, sent as a bearer token.
   * Defaults to the `MOLECULE_VAULT_TOKEN` env var.
   */
  token?: string

  /**
   * The molecule.dev app id, sent as the `X-Molecule-App-Id` header.
   * Defaults to the `MOLECULE_APP_ID` env var.
   */
  appId?: string
}

/**
 * Creates an HTTP activity sink that POSTs each event to molecule.dev.
 *
 * Best-effort: a failed POST (or a thrown `fetch`) is caught and logged, never
 * rethrown, so capture providers can record unconditionally.
 *
 * @param options - Endpoint URL, runtime token, and app id. Each falls back to
 *   its corresponding `MOLECULE_*` env var, resolved per-request.
 * @returns An {@link ActivitySink} backed by an HTTP POST.
 */
export function createHttpSink(options: HttpActivitySinkOptions = {}): ActivitySink {
  return {
    async record(event: ActivityEvent): Promise<void> {
      const url = options.url ?? process.env.MOLECULE_ACTIVITY_URL ?? DEFAULT_ACTIVITY_URL
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
