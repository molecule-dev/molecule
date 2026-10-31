/**
 * Credential redaction shared by local errors, loggers and analytics emitters.
 *
 * @module
 */

const REDACTED = '[REDACTED]'
const CIRCULAR = '[Circular]'
const ACCESSOR_ERROR = '[ACCESSOR_ERROR]'

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

/** Compact spellings which contain no separator for the word classifier to find. */
const COMPACT_CREDENTIAL_NAMES = new Set([
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'clientsecret',
  'apikey',
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

const collapsedName = (name: string): string =>
  decodedName(name)
    .toLowerCase()
    .replace(/[^a-z\d]/g, '')

/** Whether a URL parameter, header or plain-object key names a credential. */
const isCredentialName = (name: string): boolean => {
  const decoded = decodedName(name)
  const collapsed = collapsedName(name)
  if (NON_CREDENTIAL_NAMES.has(collapsed)) return false
  if (CREDENTIAL_HEADERS.has(decoded.toLowerCase())) return true
  if (COMPACT_CREDENTIAL_NAMES.has(collapsed)) return true
  const words = decoded
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean)
  // Substrings such as "monkey", "keyboard" and "tokenized" remain ordinary names.
  return words.some((word) => CREDENTIAL_WORDS.has(word))
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
const redactUrlText = (value: string): string =>
  redactParameterSpans(
    value.replace(URL_USERINFO, (_match, prefix: string) => `${prefix}${REDACTED}@`),
  )

/**
 * Scrub an un prefixed form body by decoded parameter name. Names, delimiters, safe values and
 * their original percent-encoding stay byte-for-byte; URL credentials in safe values still scrub.
 */
const redactFormOrUrlText = (value: string): string => {
  const parameters = value.split('&')
  const form =
    value.includes('=') &&
    parameters.every((parameter) => {
      const equals = parameter.indexOf('=')
      if (equals <= 0) return false
      const name = parameter.slice(0, equals)
      // A URL/query introducer, whitespace or a scheme means this is text/a URL, not a form.
      return !/[\s/?#:]/.test(decodedName(name))
    })
  if (!form) return redactUrlText(value)

  const formRedacted = parameters
    .map((parameter) => {
      const equals = parameter.indexOf('=')
      const name = parameter.slice(0, equals)
      return isCredentialName(name) ? `${name}=${REDACTED}` : parameter
    })
    .join('&')
  return redactUrlText(formRedacted)
}

interface ScrubResult {
  value: unknown
  changed: boolean
}

/** Define an own value without special-casing `__proto__` as a prototype mutation. */
const defineValue = (target: object, key: string | symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

const isErrorValue = (value: object): value is Error =>
  value instanceof Error || (typeof DOMException !== 'undefined' && value instanceof DOMException)

/**
 * Parse a string by its actual shape. A clean JSON document returns its original bytes rather
 * than a reformatted serialization; a changed one is serialized from its scrubbed tree.
 */
const scrubString = (value: string, scrubTree: (nested: unknown) => ScrubResult): ScrubResult => {
  let parsed: unknown
  let isJSON = false
  try {
    parsed = JSON.parse(value) as unknown
    isJSON = true
  } catch (_error) {
    // Not JSON: form and URL handling below decide which spans, if any, need changing.
  }
  if (isJSON) {
    const nested = scrubTree(parsed)
    return nested.changed
      ? { value: JSON.stringify(nested.value), changed: true }
      : { value, changed: false }
  }
  const redacted = redactFormOrUrlText(value)
  return { value: redacted, changed: redacted !== value }
}

/** Clone common value containers without inventing native Error internal-slot prototypes. */
const cloneContainer = (current: object): { clone: object; changed: boolean } => {
  if (Array.isArray(current)) return { clone: new Array(current.length), changed: false }
  if (current instanceof Date) return { clone: new Date(current.getTime()), changed: false }
  if (current instanceof RegExp) {
    const clone = new RegExp(current.source, current.flags)
    clone.lastIndex = current.lastIndex
    return { clone, changed: false }
  }
  if (current instanceof Map) return { clone: new Map(), changed: false }
  if (current instanceof Set) return { clone: new Set(), changed: false }
  if (current instanceof URL) {
    const href = redactUrlText(current.href)
    return { clone: new URL(href), changed: href !== current.href }
  }
  if (typeof Blob !== 'undefined' && current instanceof Blob) {
    return { clone: current.slice(), changed: false }
  }
  if (current instanceof ArrayBuffer) return { clone: current.slice(0), changed: false }
  if (ArrayBuffer.isView(current)) {
    const view = current as ArrayBufferView & { slice?: () => object }
    if (view.slice) return { clone: view.slice(), changed: false }
    const buffer = current.buffer.slice(current.byteOffset, current.byteOffset + current.byteLength)
    return { clone: new DataView(buffer), changed: false }
  }
  return {
    clone: Object.getPrototypeOf(current) === null ? Object.create(null) : {},
    changed: false,
  }
}

/**
 * Deeply redact credentials from strings, Errors, arrays and object trees.
 *
 * The return is always a NEW tree for object input; the input is never mutated or reconnected to
 * the result. Own enumerable properties are read. A credential-named accessor is replaced without
 * invocation; any other accessor is invoked on the ORIGINAL object inside try/catch, its result is
 * scrubbed, and a throw becomes `"[ACCESSOR_ERROR]"`. A reference already on the current path
 * becomes `"[Circular]"`; the same reference reached by different paths is scrubbed independently.
 *
 * URL parameter names are percent-decoded for classification, but their original bytes are
 * retained. String bodies that parse as JSON are scrubbed as trees and re-serialized only when
 * changed; form-encoded strings scrub by decoded parameter name; all other strings scrub URL
 * userinfo and credential query/fragment values. Credential object keys and headers get a
 * `[REDACTED]` value. Authorization/cookie headers retain the failed-response contract's omission.
 *
 * `errorCode`, `errorKey`, `i18nCode`, `i18nKey`, `statusCode`, and `code` ON AN ERROR OR ITS CAUSE
 * are exempt from credential CLASSIFICATION ONLY; their values are still recursively scrubbed.
 * Direct `key`/`code` members of an object-valued error identifier retain that diagnostic meaning
 * (so `{ errorKey: { key: 'invalid' } }` survives), while sibling credential names still redact.
 * OAuth/query `code` remains a credential. Validation messages are app data: direct data fields of
 * a plain object whose parent key is exactly `errors` (case-insensitive) keep their field names
 * when the value is a string or an array containing only strings. Those strings are still URL/body
 * scrubbed. Other value shapes, nested containers and credential-named accessors follow the normal
 * credential rule.
 *
 * Errors are copied to plain Error instances with their name and scrubbed message, stack, cause
 * and enumerable metadata; no native Error/DOMException prototype is rebuilt. At a rethrow
 * boundary, `preserveCleanError` retains the original Error/DOMException only when nothing changed.
 *
 * @param value - A value that may be retained by an error or emitted to a remote provider.
 * @param preserveCleanError - Keep a credential-free caught error instance instead of its new copy.
 * @returns A redacted new tree (or the same primitive/clean preserved error), never an
 *   identity-restored object input.
 */
export const redactCredentials = <T>(value: T, preserveCleanError = false): T => {
  const result = scrubRoot(value)
  return preserveCleanError &&
    value !== null &&
    typeof value === 'object' &&
    isErrorValue(value) &&
    !result.changed
    ? value
    : (result.value as T)
}

/** Run one walk with path-local ancestry; there is deliberately no global identity cache. */
const scrubRoot = (value: unknown): ScrubResult => {
  const ancestors = new WeakSet<object>()

  const scrub = (
    current: unknown,
    headersContext = false,
    validationContext = false,
    identifierContext = false,
  ): ScrubResult => {
    if (typeof current === 'string') return scrubString(current, (nested) => scrub(nested))
    if (current === null || typeof current !== 'object') {
      return { value: current, changed: false }
    }
    if (ancestors.has(current)) return { value: CIRCULAR, changed: false }

    const isError = isErrorValue(current)
    const container = isError
      ? { clone: new Error() as object, changed: false }
      : cloneContainer(current)
    const clone = container.clone
    let changed = container.changed
    ancestors.add(current)

    try {
      if (isError) {
        // Error internals are standard data even though message/stack/cause are non-enumerable.
        // Reading them on the original keeps native DOMException getters valid.
        for (const key of ['name', 'message', 'stack', 'cause'] as const) {
          if (key === 'cause' && !('cause' in current)) continue
          let original: unknown
          try {
            original = Reflect.get(current, key) as unknown
          } catch (_error) {
            original = ACCESSOR_ERROR
            changed = true
          }
          const nested = key === 'name' ? { value: original, changed: false } : scrub(original)
          if (nested.changed) changed = true
          const descriptor = Object.getOwnPropertyDescriptor(current, key)
          Object.defineProperty(clone, key, {
            value: nested.value,
            enumerable: descriptor?.enumerable ?? false,
            configurable: true,
            writable: true,
          })
        }
      } else if (clone instanceof Map && current instanceof Map) {
        for (const [key, entryValue] of current) {
          const scrubbedKey = scrub(key)
          const scrubbedValue = scrub(entryValue)
          if (scrubbedKey.changed || scrubbedValue.changed) changed = true
          clone.set(scrubbedKey.value, scrubbedValue.value)
        }
      } else if (clone instanceof Set && current instanceof Set) {
        for (const entryValue of current) {
          const nested = scrub(entryValue)
          if (nested.changed) changed = true
          clone.add(nested.value)
        }
      }

      const keys = Reflect.ownKeys(current).filter((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(current, key)
        // Error brands are non-enumerable symbols, not credential-named data. Retaining them keeps
        // isHttpError() working on a logged copy without copying arbitrary non-enumerable fields.
        return descriptor?.enumerable === true || (isError && typeof key === 'symbol')
      })
      for (const key of keys) {
        if (
          isError &&
          (key === 'name' || key === 'message' || key === 'stack' || key === 'cause')
        ) {
          continue
        }
        const descriptor = Object.getOwnPropertyDescriptor(current, key)
        if (!descriptor) continue

        const headerOmission =
          headersContext &&
          typeof key === 'string' &&
          CREDENTIAL_HEADERS.has(decodedName(key).toLowerCase())
        if (headerOmission) {
          changed = true
          continue
        }

        const collapsed = typeof key === 'string' ? collapsedName(key) : ''
        const keyIsFrameworkIdentifier =
          typeof key === 'string' &&
          (NON_CREDENTIAL_NAMES.has(collapsed) ||
            (isError && collapsed === 'code') ||
            (identifierContext && (collapsed === 'key' || collapsed === 'code')))
        const validationMessage =
          validationContext &&
          'value' in descriptor &&
          (typeof descriptor.value === 'string' ||
            (Array.isArray(descriptor.value) &&
              descriptor.value.every((message) => typeof message === 'string')))
        const keyIsCredential =
          typeof key === 'string' &&
          isCredentialName(key) &&
          !keyIsFrameworkIdentifier &&
          !validationMessage

        let nested: ScrubResult
        if (keyIsCredential) {
          // In particular, do not invoke a credential-named getter just to discover its shape.
          nested = {
            value: REDACTED,
            changed: !('value' in descriptor) || descriptor.value !== REDACTED,
          }
        } else {
          let original: unknown
          let accessorFailed = false
          if ('value' in descriptor) {
            original = descriptor.value
          } else {
            try {
              original = Reflect.get(current, key) as unknown
            } catch (_error) {
              original = ACCESSOR_ERROR
              accessorFailed = true
              changed = true
            }
          }
          const childHeadersContext = typeof key === 'string' && key.toLowerCase() === 'headers'
          const childValidationContext = typeof key === 'string' && key.toLowerCase() === 'errors'
          const childIdentifierContext =
            typeof key === 'string' && NON_CREDENTIAL_NAMES.has(collapsed)
          nested = accessorFailed
            ? { value: ACCESSOR_ERROR, changed: false }
            : scrub(original, childHeadersContext, childValidationContext, childIdentifierContext)
        }
        if (nested.changed) changed = true
        if (isError && typeof key === 'symbol' && !descriptor.enumerable) {
          Object.defineProperty(clone, key, {
            value: nested.value,
            enumerable: false,
            configurable: true,
            writable: true,
          })
        } else {
          defineValue(clone, key, nested.value)
        }
      }
    } finally {
      ancestors.delete(current)
    }

    return { value: clone, changed }
  }

  return scrub(value)
}
