/**
 * Credential redaction shared by local errors, loggers and analytics emitters.
 *
 * @module
 */

const REDACTED = '[REDACTED]'

/** Names whose values are credentials, compared as decoded, case-insensitive words. */
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

/** Credential headers whose names do not contain a separate `auth` word. */
const CREDENTIAL_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'set-cookie2',
])

/** Framework error identifiers are not credentials despite ending in `Key`/`Code`. */
const NON_CREDENTIAL_NAMES = new Set(['errorkey', 'i18nkey', 'errorcode', 'i18ncode', 'statuscode'])

/** Decode a parameter/key name for classification without changing its emitted bytes. */
const decodedName = (name: string): string => {
  try {
    return decodeURIComponent(name.replace(/\+/g, ' '))
  } catch (_error) {
    // Malformed percent escapes stay literal and are still classified by their raw words.
    return name
  }
}

/** Whether a URL parameter, header or plain-object key names a credential. */
const isCredentialName = (name: string): boolean => {
  const decoded = decodedName(name)
  const collapsed = decoded.toLowerCase().replace(/[^a-z\d]/g, '')
  if (NON_CREDENTIAL_NAMES.has(collapsed)) return false
  if (CREDENTIAL_HEADERS.has(decoded.toLowerCase())) return true
  const words = decoded
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean)
  if (words.some((word) => CREDENTIAL_WORDS.has(word))) return true
  // The conventional unseparated spelling is a credential too; substrings such
  // as "monkey" and "keyboard" remain ordinary, non-credential names.
  return collapsed === 'apikey'
}

/** URL userinfo, confined to an authority and including its separating `@`. */
const URL_USERINFO = /((?:[a-z][a-z\d+.-]*:)?\/\/)[^/?#\s]*@/gi

/** A query or fragment span. A path's `&name=value` text has no such span. */
const URL_PARAMETER_SPAN = /[?#][^\s]*/g

/** Redact credential values inside real query/fragment spans, retaining every name and delimiter. */
const redactParameterSpans = (value: string): string =>
  value.replace(URL_PARAMETER_SPAN, (span) =>
    span.replace(/(^[?#]|[&#])([^&#]*)/g, (match, prefix: string, parameter: string) => {
      const equals = parameter.indexOf('=')
      if (equals < 0) return match
      const name = parameter.slice(0, equals)
      return isCredentialName(name) ? `${prefix}${name}=${REDACTED}` : match
    }),
  )

/** Redact URL credentials in text without rewriting path bytes. */
const redactString = (value: string): string =>
  redactParameterSpans(
    value.replace(URL_USERINFO, (_match, prefix: string) => `${prefix}${REDACTED}@`),
  )

interface ScrubResult {
  value: unknown
  changed: boolean
}

type ScrubRecord = ScrubResult

/** Define an own value without special-casing `__proto__` as a prototype mutation. */
const defineValue = (target: object, key: string | symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

/**
 * Deeply redact credentials from strings, Errors, arrays and plain objects.
 *
 * URL parameter names are percent-decoded for classification, but their original bytes are
 * retained. Credential object keys and headers get a `[REDACTED]` value; other values are
 * walked recursively. Errors retain their prototype and own property descriptors, including
 * message, stack and cause. Cycles are safe, and an entirely unchanged graph keeps its original
 * identity so safe analytics/log payloads and error metadata behave exactly as before.
 *
 * @param value - A value that may be retained by an error or emitted to a remote provider.
 * @returns The original value when no credential was present, otherwise a redacted copy.
 */
export const redactCredentials = <T>(value: T): T => {
  const scrub = (
    current: unknown,
    seen: WeakMap<object, ScrubRecord>,
    headersContext = false,
  ): ScrubResult => {
    if (typeof current === 'string') {
      const redacted = redactString(current)
      return { value: redacted, changed: redacted !== current }
    }
    if (current === null || typeof current !== 'object') return { value: current, changed: false }

    const cached = seen.get(current)
    if (cached) return { value: cached.value, changed: false }

    const isError = current instanceof Error
    const isArray = Array.isArray(current)
    const prototype = Object.getPrototypeOf(current)
    if (!isError && !isArray && prototype !== Object.prototype && prototype !== null) {
      return { value: current, changed: false }
    }

    const clone: object = isArray
      ? new Array((current as unknown[]).length)
      : Object.create(prototype)
    const record: ScrubRecord = { value: clone, changed: false }
    seen.set(current, record)

    const keys = isError ? Reflect.ownKeys(current) : Object.keys(current)
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (!descriptor) continue
      // The failed-response contract has always omitted credential cookies and
      // authorization headers. Keep that shape while the same classifier also
      // handles newer x-auth/x-token header names.
      if (
        headersContext &&
        typeof key === 'string' &&
        CREDENTIAL_HEADERS.has(decodedName(key).toLowerCase())
      ) {
        record.changed = true
        continue
      }
      const childHeadersContext = typeof key === 'string' && key.toLowerCase() === 'headers'
      if (!('value' in descriptor)) {
        // V8 can expose `stack` as an own accessor. Materialize the standard
        // Error fields on the clone; copying that accessor would read the
        // clone's uninitialized internal slot and yield `undefined`.
        if (!isError || (key !== 'message' && key !== 'stack' && key !== 'cause')) {
          Object.defineProperty(clone, key, descriptor)
          continue
        }
        const original = Reflect.get(current, key) as unknown
        const nested = scrub(original, seen, childHeadersContext)
        if (nested.changed) record.changed = true
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: descriptor.enumerable,
          configurable: descriptor.configurable,
          writable: true,
        })
        continue
      }

      const keyIsCredential = typeof key === 'string' && isCredentialName(key)
      const keyIsFrameworkIdentifier =
        typeof key === 'string' &&
        NON_CREDENTIAL_NAMES.has(
          decodedName(key)
            .toLowerCase()
            .replace(/[^a-z\d]/g, ''),
        )
      const nested = keyIsFrameworkIdentifier
        ? { value: descriptor.value, changed: false }
        : keyIsCredential
          ? { value: REDACTED, changed: descriptor.value !== REDACTED }
          : scrub(descriptor.value, seen, childHeadersContext)
      if (nested.changed) record.changed = true

      if (isError) {
        Object.defineProperty(clone, key, { ...descriptor, value: nested.value })
      } else {
        defineValue(clone, key, nested.value)
      }
    }

    if (!record.changed) record.value = current
    return { value: record.value, changed: record.changed }
  }

  return scrub(value, new WeakMap()).value as T
}
