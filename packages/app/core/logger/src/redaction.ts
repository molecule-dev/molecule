/**
 * One-shot credential snapshots shared by local errors, loggers and analytics emitters.
 *
 * @module
 */

import { errorFromSnapshot } from './error-snapshot.js'

const REDACTED = '[REDACTED]'
const CIRCULAR = '[Circular]'
const ACCESSOR_ERROR = '[ACCESSOR_ERROR]'
const STACK_UNAVAILABLE = '[STACK_UNAVAILABLE]'
const HTTP_ERROR_BRAND = Symbol.for('@molecule/app-http/HttpError')
const DIAGNOSTIC_CODE = /^[A-Z][A-Z0-9_]{0,63}$/

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
const ERROR_FIELDS = [
  'name',
  'message',
  'stack',
  'code',
  'errorCode',
  'errorKey',
  'status',
  'statusText',
  'cause',
  'errors',
] as const

/** Decode a parameter/key name for classification without changing its emitted bytes. */
const decodedName = (name: string): string => {
  try {
    return decodeURIComponent(name.replace(/\+/g, ' '))
  } catch (_error) {
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
  return words.some((word) => CREDENTIAL_WORDS.has(word))
}

/** URL userinfo, confined to an authority and including its separating `@`. */
const URL_USERINFO = /((?:[a-z][a-z\d+.-]*:)?\/\/)[^/?#\s]*@/gi
/** A query or fragment span. A path's `&name=value` text has no such span. */
const URL_PARAMETER_SPAN = /[?#][^\s]*/g
/** HTTP field lines; the classifier, rather than a short denylist, decides whether to redact. */
const HEADER_LINE = /(^|\r?\n)([\t ]*)([!#$%&'*+.^_`|~\dA-Za-z-]+):([\t ]*)([^\r\n]*)/g

/** Redact credential values inside real query/fragment spans, retaining safe bytes. */
const redactParameterSpans = (value: string): string =>
  value.replace(URL_PARAMETER_SPAN, (span) =>
    span.replace(/(^[?#]|[&#])([^&#]*)/g, (match, prefix: string, parameter: string) => {
      const equals = parameter.indexOf('=')
      if (equals < 0) return match
      const name = parameter.slice(0, equals)
      return isCredentialName(name) ? `${prefix}${name}=${REDACTED}` : match
    }),
  )

const redactUrlText = (value: string): string =>
  redactParameterSpans(
    value.replace(URL_USERINFO, (_match, prefix: string) => `${prefix}${REDACTED}@`),
  )

const redactHeaderLines = (value: string): string =>
  value.replace(HEADER_LINE, (match, line: string, indent: string, name: string, space: string) =>
    isCredentialName(name) ? `${line}${indent}${name}:${space}${REDACTED}` : match,
  )

/**
 * Scrub unprefixed form text using URLSearchParams segment semantics: empty and bare segments are
 * valid, only a segment with `=` has a value, and decoded names are never rewritten.
 */
const redactFormOrUrlText = (value: string): string => {
  const parameters = value.split('&')
  const form =
    value.includes('=') &&
    parameters.every((parameter) => {
      const equals = parameter.indexOf('=')
      const name = equals < 0 ? parameter : parameter.slice(0, equals)
      return !/[\s/?#:]/.test(decodedName(name))
    })
  if (!form) return redactUrlText(value)
  const redacted = parameters
    .map((parameter) => {
      const equals = parameter.indexOf('=')
      if (equals < 0) return parameter
      const name = parameter.slice(0, equals)
      return isCredentialName(name) ? `${name}=${REDACTED}` : parameter
    })
    .join('&')
  return redactUrlText(redacted)
}

/** Define an own value without special-casing `__proto__` as a prototype mutation. */
const defineValue = (target: object, key: string, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

const isErrorValue = (value: object): value is Error =>
  value instanceof Error || (typeof DOMException !== 'undefined' && value instanceof DOMException)

const isBinary = (value: object): value is ArrayBuffer | ArrayBufferView =>
  value instanceof ArrayBuffer || ArrayBuffer.isView(value)

const binaryBytes = (value: ArrayBuffer | ArrayBufferView): Uint8Array => {
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
}

interface CaptureContext {
  headers: boolean
  validation: boolean
  errorChain: boolean
  identifier: boolean
}

const DEFAULT_CONTEXT: CaptureContext = {
  headers: false,
  validation: false,
  errorChain: false,
  identifier: false,
}

/**
 * Capture once and scrub only the detached result. No original object, native internal or
 * executable serialization hook is reachable from the returned tree.
 */
const snapshotRoot = (value: unknown): unknown => {
  const ancestors = new WeakSet<object>()

  const scrubString = (text: string): string => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch (_error) {
      return redactFormOrUrlText(redactHeaderLines(text))
    }
    const snapshot = capture(parsed, DEFAULT_CONTEXT)
    // A clean JSON document keeps its original whitespace and bytes. Parsed JSON has no hooks, so
    // this canonical comparison cannot execute caller code.
    return JSON.stringify(snapshot) === JSON.stringify(parsed)
      ? text
      : (JSON.stringify(snapshot) ?? text)
  }

  const capture = (current: unknown, context: CaptureContext): unknown => {
    if (typeof current === 'string') return scrubString(current)
    if (current === null || current === undefined) return current
    if (typeof current === 'bigint') return String(current)
    if (typeof current === 'function') return '[Function]'
    if (typeof current === 'symbol') return String(current)
    if (typeof current !== 'object') return current
    if (ancestors.has(current)) return CIRCULAR

    ancestors.add(current)
    try {
      if (typeof Blob !== 'undefined' && current instanceof Blob) {
        return `[Blob ${current.size} bytes ${current.type}]`
      }
      if (isBinary(current)) {
        const bytes = binaryBytes(current)
        try {
          return scrubString(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
        } catch (_error) {
          return `[binary ${bytes.byteLength} bytes]`
        }
      }

      // Materialize a serialization hook at capture, never carry the hook into a sink. Reflect.get
      // is the sole read of this property; an accessor therefore also runs at most once.
      let toJSON: unknown
      try {
        toJSON = Reflect.get(current, 'toJSON') as unknown
      } catch (_error) {
        return ACCESSOR_ERROR
      }
      if (typeof toJSON === 'function') {
        try {
          return capture(Reflect.apply(toJSON, current, []), context)
        } catch (_error) {
          return ACCESSOR_ERROR
        }
      }

      const errorValue = isErrorValue(current)
      const errorChain = context.errorChain || errorValue
      if (current instanceof Map) {
        return Array.from(current, ([key, entryValue]) => [
          capture(key, DEFAULT_CONTEXT),
          typeof key === 'string' && isCredentialName(key)
            ? REDACTED
            : capture(entryValue, DEFAULT_CONTEXT),
        ])
      }
      if (current instanceof Set) {
        return Array.from(current, (entryValue) => capture(entryValue, DEFAULT_CONTEXT))
      }

      const clone: object = Array.isArray(current)
        ? new Array(current.length)
        : Object.getPrototypeOf(current) === null
          ? Object.create(null)
          : {}
      const fields = errorValue
        ? [...ERROR_FIELDS, ...Reflect.ownKeys(current).filter((key) => typeof key === 'string')]
        : Reflect.ownKeys(current).filter((key) => typeof key === 'string')
      const visited = new Set<string>()

      for (const key of fields) {
        const name = key as string
        if (visited.has(name) || (Array.isArray(current) && name === 'length')) continue
        visited.add(name)
        if (!errorValue || !ERROR_FIELDS.includes(name as (typeof ERROR_FIELDS)[number])) {
          const descriptor = Object.getOwnPropertyDescriptor(current, name)
          if (!descriptor && errorValue) continue
        }
        if (!errorValue && !(name in current)) continue

        const descriptor = Object.getOwnPropertyDescriptor(current, name)
        const collapsed = collapsedName(name)
        const validationMessage =
          context.validation &&
          descriptor !== undefined &&
          'value' in descriptor &&
          (typeof descriptor.value === 'string' ||
            (Array.isArray(descriptor.value) &&
              descriptor.value.every((message) => typeof message === 'string')))
        const frameworkIdentifier =
          NON_CREDENTIAL_NAMES.has(collapsed) ||
          (errorChain && collapsed === 'code') ||
          (context.identifier && (collapsed === 'key' || collapsed === 'code'))
        const credential = isCredentialName(name) && !frameworkIdentifier && !validationMessage

        if (context.headers && CREDENTIAL_HEADERS.has(decodedName(name).toLowerCase())) continue
        if (credential) {
          // In particular, never invoke a credential-named accessor to discover its shape.
          defineValue(clone, name, REDACTED)
          continue
        }

        // V8's lazy Error.stack formatter reads name/message again. Never let that implicit
        // native read re-enter an accessor after its one snapshot read; ordinary stacks are kept.
        const sideEffectfulStack =
          errorValue &&
          name === 'stack' &&
          descriptor !== undefined &&
          !('value' in descriptor) &&
          ['name', 'message'].some((field) => {
            const fieldDescriptor = Object.getOwnPropertyDescriptor(current, field)
            return fieldDescriptor !== undefined && !('value' in fieldDescriptor)
          })
        if (sideEffectfulStack) {
          defineValue(clone, name, STACK_UNAVAILABLE)
          continue
        }

        let original: unknown
        if (descriptor && 'value' in descriptor) {
          original = descriptor.value
        } else {
          try {
            original = Reflect.get(current, name) as unknown
          } catch (_error) {
            defineValue(clone, name, ACCESSOR_ERROR)
            continue
          }
        }
        if (errorChain && ['code', 'errorcode', 'errorkey'].includes(collapsed)) {
          if (typeof original === 'string' && DIAGNOSTIC_CODE.test(original)) {
            defineValue(clone, name, original)
            continue
          }
        }

        const childContext: CaptureContext = {
          headers: name.toLowerCase() === 'headers',
          validation: name.toLowerCase() === 'errors',
          errorChain,
          identifier: NON_CREDENTIAL_NAMES.has(collapsed),
        }
        defineValue(clone, name, capture(original, childContext))
      }

      // Preserve only the cross-copy HttpError boolean brand, never arbitrary native symbols.
      if (errorValue && Reflect.get(current, HTTP_ERROR_BRAND) === true) {
        Object.defineProperty(clone, HTTP_ERROR_BRAND, { value: true })
      }
      return clone
    } finally {
      ancestors.delete(current)
    }
  }

  return capture(value, DEFAULT_CONTEXT)
}

/**
 * Convert an input ONCE to detached, scrubbed data for a logger, analytics or retained-error
 * capture boundary. Maps become entry arrays, Sets arrays, Errors plain records (including
 * non-enumerable AggregateError.errors), UTF-8 binary text, other binary a size marker, and Blobs
 * inert size/type markers. Dates and custom `toJSON` values become their snapshotted hook result.
 *
 * Each own property is read at most once. Credential-named accessors are not invoked; every other
 * accessor runs once in try/catch and a throw becomes `[ACCESSOR_ERROR]`. A lazy native stack that
 * would re-read an accessor-backed name/message becomes `[STACK_UNAVAILABLE]`. Path cycles become
 * `[Circular]`; shared references are captured independently. Under an Error/cause chain, upper-
 * case diagnostic `code`/`errorCode`/`errorKey` tokens up to 64 characters survive at any depth.
 * Direct string/string-array validation messages under `errors` retain their field names. OAuth
 * query `code` values and credential HTTP field lines remain credentials.
 */
export const snapshotCredentials = <T>(value: T): T => snapshotRoot(value) as T

/**
 * Scrub a value for direct callers. Root Errors become fresh readable Error instances for
 * compatibility; sink boundaries use {@link snapshotCredentials} to keep nested Errors as data.
 */
export const redactCredentials = <T>(value: T): T => {
  const snapshot = snapshotRoot(value)
  if (value === null || typeof value !== 'object' || !isErrorValue(value)) return snapshot as T
  return errorFromSnapshot(snapshot) as T
}
