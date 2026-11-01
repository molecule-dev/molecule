/**
 * SDK egress URL scrubbing for browser analytics providers.
 *
 * @module
 */

import { snapshotCredentials } from '@molecule/app-logger'

const URL_PROPERTY = /(?:^|[_$])(?:url|referrer|pathname)(?:$|_)/i
const PAYLOAD_CONTAINERS = new Set(['properties', '$set', '$set_once'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isUrlProperty = (name: string): boolean =>
  name.startsWith('$initial_') || URL_PROPERTY.test(name)

/**
 * Copy an SDK-built event and scrub URL-valued properties added AFTER molecule's input boundary.
 * Covers `$current_url`, `$referrer`, `$pathname`, every `$initial_*` property, session-entry and
 * provider-specific URL names, recursively inside `properties`, `$set` and `$set_once`. Required
 * SDK project tokens and all non-URL values retain their identities and bytes.
 *
 * @param payload - A PostHog CaptureResult, Mixpanel BeforeSendHookPayload, or compatible record.
 * @returns A shallow-copied payload with fresh containers along the URL-property paths.
 */
export const snapshotAnalyticsSdkUrls = <T>(payload: T): T => {
  if (!isRecord(payload)) return payload
  const snapshot: Record<string, unknown> = { ...payload }
  for (const [name, value] of Object.entries(snapshot)) {
    if (PAYLOAD_CONTAINERS.has(name) && isRecord(value)) {
      snapshot[name] = snapshotAnalyticsSdkUrls(value)
    } else if (typeof value === 'string' && isUrlProperty(name)) {
      snapshot[name] = snapshotCredentials(value)
    }
  }
  return snapshot as T
}
