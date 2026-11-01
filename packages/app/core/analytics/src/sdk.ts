/**
 * Data-only credential capture for browser analytics SDK transports.
 *
 * @module
 */

import { snapshotCredentials } from '@molecule/app-logger'

const REDACTED = '[REDACTED]'
const CIRCULAR = '[Circular]'
const ACCESSOR_ERROR = '[ACCESSOR_ERROR]'
const BARE_AUTHORITY = /^(\s*)([^\s@/]+)@([^\s@]+?)(\s*)$/
const AUTHORITY_PROPERTIES = new Set([
  '$referring_domain',
  '$initial_referring_domain',
  '$session_entry_referring_domain',
])

/** Exact direct-property metadata emitted by posthog-js 1.438.21 SessionPropsManager. */
const SDK_SESSION_ENTRY_PROPERTIES = new Set([
  '$session_entry_url',
  '$session_entry_referrer',
  '$session_entry_referring_domain',
  '$session_entry_host',
  '$session_entry_pathname',
  '$session_entry_utm_source',
  '$session_entry_utm_medium',
  '$session_entry_utm_campaign',
  '$session_entry_utm_content',
  '$session_entry_utm_term',
  '$session_entry_gad_source',
  '$session_entry_mc_cid',
  '$session_entry_gclid',
  '$session_entry_gclsrc',
  '$session_entry_dclid',
  '$session_entry_gbraid',
  '$session_entry_wbraid',
  '$session_entry_fbclid',
  '$session_entry_msclkid',
  '$session_entry_twclid',
  '$session_entry_li_fat_id',
  '$session_entry_igshid',
  '$session_entry_ttclid',
  '$session_entry_rdt_cid',
  '$session_entry_epik',
  '$session_entry_qclid',
  '$session_entry_sccid',
  '$session_entry_oppref',
  '$session_entry_bfcid',
  '$session_entry_irclid',
  '$session_entry__kx',
  '$session_entry_search_engine',
  '$session_entry_ph_keyword',
])

const CREDENTIAL_WORDS = new Set([
  'token',
  'auth',
  'session',
  'secret',
  'password',
  'passwd',
  'key',
  'code',
  'signature',
  'sig',
  'jwt',
  'bearer',
  'credential',
])
const COMPACT_CREDENTIAL_NAMES = new Set([
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'clientsecret',
  'apikey',
])
const CREDENTIAL_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'set-cookie2',
])
const NON_CREDENTIAL_NAMES = new Set(['errorkey', 'i18nkey', 'errorcode', 'i18ncode', 'statuscode'])
const CREDENTIAL_NAME_CACHE = new Map<string, boolean>()

/** Identifier positions written by posthog-js 1.438.21 or mixpanel-browser 2.84.0. */
const SDK_IDENTIFIERS = new Set([
  'distinct_id',
  '$distinct_id',
  '$anon_distinct_id',
  '$people_distinct_id',
  'device_id',
  '$device_id',
  '$user_id',
  '$had_persisted_distinct_id',
  'session_id',
  '$session_id',
  '$group_id',
  '$group_key',
  'uuid',
])

const decodedName = (name: string): string => {
  try {
    return decodeURIComponent(name.replace(/\+/g, ' '))
  } catch (_error) {
    return name
  }
}

const isCredentialName = (name: string): boolean => {
  const cached = CREDENTIAL_NAME_CACHE.get(name)
  if (cached !== undefined) return cached
  const decoded = decodedName(name)
  const collapsed = decoded.toLowerCase().replace(/[^a-z\d]/g, '')
  let credential = false
  if (!NON_CREDENTIAL_NAMES.has(collapsed)) {
    credential =
      CREDENTIAL_HEADERS.has(decoded.toLowerCase()) || COMPACT_CREDENTIAL_NAMES.has(collapsed)
    if (!credential) {
      const words = decoded
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z\d]+/)
        .filter(Boolean)
      credential = words.some((word) => CREDENTIAL_WORDS.has(word))
    }
  }
  if (CREDENTIAL_NAME_CACHE.size >= 512) CREDENTIAL_NAME_CACHE.clear()
  CREDENTIAL_NAME_CACHE.set(name, credential)
  return credential
}

/** Root and direct properties are the only SDK-owned locations; nested traits are app data. */
const isSdkIdentifier = (scope: number, name: string): boolean => {
  if (scope > 1) return false
  if (name === 'token') return true
  if (scope === 0 && name === '$token') return true
  return SDK_IDENTIFIERS.has(name)
}

/** Scrub every serialized string; only an SDK domain context treats bare userinfo specially. */
const snapshotString = (value: string, authority: boolean): string => {
  const scrubbed = snapshotCredentials(value)
  const match = BARE_AUTHORITY.exec(scrubbed)
  if (!match || (!authority && !match[2].includes(':'))) return scrubbed
  return `${match[1]}${REDACTED}@${match[3]}${match[4]}`
}

const defineValue = (target: object, key: string, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

/** Neutralize only a serializer the captured container actually inherited. */
const preventInheritedSerializer = (copy: object): void => {
  if (typeof Reflect.get(copy, 'toJSON') === 'function') {
    Object.defineProperty(copy, 'toJSON', {
      value: undefined,
      configurable: true,
      writable: true,
    })
  }
}

/**
 * Copy an SDK-built payload into inert data immediately before its transport. Credential-named
 * fields are redacted at any depth without invoking their accessors. Plain objects and arrays are
 * detached; functions are dropped, while enumerable class fields and `toJSON` results are
 * materialized once as inert data. Serialized strings retain safe components and ordinary identifiers.
 *
 * The SDK itself owns only root/direct-property identifiers: the project `token`/`$token`,
 * distinct/device/session/user/group IDs and UUIDs. A nested app trait named `token` or `session_id`
 * is therefore still redacted. SDK-derived referring domains retain authority context, so
 * username-only userinfo is removed while an ordinary email address is unchanged.
 *
 * @param payload - A PostHog CaptureResult, Mixpanel hook payload, or compatible value.
 * @returns A detached data-only payload with credential and URL values scrubbed.
 */
export const snapshotAnalyticsSdkUrls = <T>(payload: T): T => {
  const copies = new WeakMap<object, unknown>()
  const activeSerializers = new WeakSet<object>()

  /** scope: 0 root, 1 direct SDK properties, 2 nested application data. */
  const capture = (
    value: unknown,
    scope: number,
    key = '',
    authority = false,
    materialized = false,
  ): unknown => {
    if (typeof value === 'string') return snapshotString(value, authority)
    if (value === null || value === undefined) return value
    if (typeof value === 'bigint') return String(value)
    if (typeof value === 'function' || typeof value === 'symbol') return undefined
    if (typeof value !== 'object') return value
    if (copies.has(value)) return copies.get(value)

    if (!materialized) {
      let toJSON: unknown
      try {
        toJSON = Reflect.get(value, 'toJSON') as unknown
      } catch (_error) {
        return undefined
      }
      if (typeof toJSON === 'function') {
        if (activeSerializers.has(value)) return CIRCULAR
        activeSerializers.add(value)
        try {
          const serialized = Reflect.apply(toJSON, value, [key]) as unknown
          const result = capture(serialized, scope, key, authority, true)
          copies.set(value, result)
          return result
        } catch (_error) {
          return undefined
        } finally {
          activeSerializers.delete(value)
        }
      }
    }

    if (Array.isArray(value)) {
      const copy: unknown[] = new Array(value.length)
      copies.set(value, copy)
      preventInheritedSerializer(copy)
      for (let index = 0; index < value.length; index++) {
        if (!(index in value)) continue
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
        const original =
          descriptor && 'value' in descriptor
            ? descriptor.value
            : (Reflect.get(value, String(index)) as unknown)
        const result = capture(original, scope, String(index))
        copy[index] = result === undefined && original !== undefined ? null : result
      }
      return copy
    }

    // Native JSON transport serializes enumerable class fields too; retain them as inert data.
    const copy: Record<string, unknown> = {}
    copies.set(value, copy)
    preventInheritedSerializer(copy)
    for (const name of Object.keys(value)) {
      const sdkMetadata = scope === 1 && SDK_SESSION_ENTRY_PROPERTIES.has(name)
      if (!sdkMetadata && isCredentialName(name) && !isSdkIdentifier(scope, name)) {
        defineValue(copy, name, REDACTED)
        continue
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, name)
      let original: unknown
      if (descriptor && 'value' in descriptor) original = descriptor.value
      else {
        try {
          original = Reflect.get(value, name) as unknown
        } catch (_error) {
          defineValue(copy, name, ACCESSOR_ERROR)
          continue
        }
      }
      const childScope = scope === 0 && name === 'properties' ? 1 : 2
      const result = capture(original, childScope, name, AUTHORITY_PROPERTIES.has(name))
      if (result === undefined && original !== undefined) continue
      defineValue(copy, name, result)
    }
    return copy
  }

  return capture(payload, 0) as T
}
