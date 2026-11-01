/**
 * SDK egress URL scrubbing for browser analytics providers.
 *
 * @module
 */

import { snapshotCredentials } from '@molecule/app-logger'

const URL_TEXT = /[?#]|(?:[a-z][a-z\d+.-]*:)?\/\//i
const BARE_AUTHORITY = /^(\s*)[^\s@/]+:[^\s@/]*@([^\s@]+?)(\s*)$/

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Scrub string syntax, never a property name, so SDK identifiers keep their ordinary values. */
const snapshotString = (value: string): string => {
  const scrubbed = URL_TEXT.test(value) ? snapshotCredentials(value) : value
  const authority = BARE_AUTHORITY.exec(scrubbed)
  return authority ? `${authority[1]}[REDACTED]@${authority[2]}${authority[3]}` : scrubbed
}

/**
 * Copy an SDK-built payload and scrub URL-shaped or authority-shaped strings added AFTER
 * molecule's input boundary. Every nested plain-object and array string is covered, including
 * DOM attributes, serialized element chains, person updates and referring domains. Project keys,
 * distinct IDs, event names and other non-URL identifiers retain their identities and bytes.
 *
 * @param payload - A PostHog CaptureResult, Mixpanel hook payload, or compatible value.
 * @returns A detached payload with fresh plain objects and arrays and scrubbed URL strings.
 */
export const snapshotAnalyticsSdkUrls = <T>(payload: T): T => {
  const copies = new WeakMap<object, unknown>()

  const snapshot = (value: unknown): unknown => {
    if (typeof value === 'string') return snapshotString(value)
    if (value === null || typeof value !== 'object') return value
    if (!Array.isArray(value) && !isRecord(value)) return value
    const existing = copies.get(value)
    if (existing) return existing

    const copy: Record<string, unknown> | unknown[] = Array.isArray(value)
      ? new Array(value.length)
      : {}
    copies.set(value, copy)
    for (const [name, child] of Object.entries(value)) {
      if (Array.isArray(copy)) copy[Number(name)] = snapshot(child)
      else copy[name] = snapshot(child)
    }
    return copy
  }

  return snapshot(payload) as T
}
