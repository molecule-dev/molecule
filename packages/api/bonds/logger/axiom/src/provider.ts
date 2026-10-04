/**
 * The Axiom logger provider: each log call is written to the inner logger
 * and, at or above the configured level, queued as one Axiom event.
 *
 * @module
 */

import { createAxiomIngester, safeStringify } from '@molecule/api-analytics-axiom'
import type { Logger, LogLevel } from '@molecule/api-logger'

import type { AxiomLogger, AxiomLoggerOptions } from './types.js'

type MirroredLevel = Exclude<LogLevel, 'silent'>

const PRIORITY: Record<MirroredLevel, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 }

const consoleLogger: Logger = {
  trace: (...args) => console.trace(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  !(value instanceof Error) &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

/**
 * Splits logger arguments into a message and structured fields: strings,
 * numbers and booleans join into `message`; plain objects merge into `fields`;
 * an Error becomes `fields.error` (or `fields.errors` for several); anything
 * else is kept in `fields.args`.
 *
 * @param args - The arguments passed to a log call.
 * @returns The message and fields.
 */
export function splitLogArgs(args: unknown[]): {
  message: string
  fields: Record<string, unknown>
} {
  const words: string[] = []
  const fields: Record<string, unknown> = {}
  const errors: Error[] = []
  const extra: unknown[] = []
  for (const arg of args) {
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      words.push(String(arg))
    } else if (arg instanceof Error) {
      errors.push(arg)
    } else if (isPlainObject(arg)) {
      Object.assign(fields, arg)
    } else if (arg !== undefined) {
      extra.push(arg)
    }
  }
  if (errors.length === 1) fields.error = errors[0]
  else if (errors.length > 1) fields.errors = errors
  if (extra.length > 0) fields.args = extra
  if (words.length === 0 && fields.error instanceof Error) words.push(fields.error.message)
  return { message: words.join(' '), fields }
}

const definedOnly = (fields: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''))

/**
 * Creates an Axiom logger.
 *
 * @param options - Ingest settings, the inner logger, the mirrored level and stamped fields.
 * @returns The logger. Without a token and dataset it only writes to `inner`.
 */
export function createLogger(options: AxiomLoggerOptions = {}): AxiomLogger {
  const inner = options.inner === undefined ? consoleLogger : options.inner
  const minPriority = PRIORITY[options.level ?? 'info']
  const fieldsMode = options.fieldsMode ?? 'json'
  const stamp = definedOnly({
    service: options.service,
    env: options.env ?? process.env.NODE_ENV,
    region: options.region,
    version: options.version,
    ...options.stamp,
  })
  // The ingester warns through console.warn, never through this logger, so a
  // failing Axiom cannot feed its own warnings back into the queue.
  const ingester = createAxiomIngester({ ...options, stamp })

  const write =
    (level: MirroredLevel) =>
    (...args: unknown[]): void => {
      inner?.[level](...args)
      if (!ingester.enabled || PRIORITY[level] < minPriority) return
      const { message, fields } = splitLogArgs(args)
      const hasFields = Object.keys(fields).length > 0
      ingester.ingest({
        kind: 'log',
        level,
        message,
        ...(hasFields
          ? { fields: fieldsMode === 'json' ? (safeStringify(fields) ?? '{}') : fields }
          : {}),
      })
    }

  return {
    enabled: ingester.enabled,
    trace: write('trace'),
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
    flush: () => ingester.flush(),
    shutdown: () => ingester.shutdown(),
  }
}

let defaultLogger: AxiomLogger | null = null
const getDefault = (): AxiomLogger => (defaultLogger ??= createLogger())

/**
 * The default logger: console output plus an Axiom mirror configured from
 * `AXIOM_TOKEN` / `AXIOM_DATASET` / `AXIOM_ORG_ID` / `AXIOM_EDGE_URL`. Created on
 * first use, so env loaded after import still applies.
 */
export const provider: AxiomLogger = {
  get enabled(): boolean {
    return getDefault().enabled
  },
  trace: (...args) => getDefault().trace(...args),
  debug: (...args) => getDefault().debug(...args),
  info: (...args) => getDefault().info(...args),
  warn: (...args) => getDefault().warn(...args),
  error: (...args) => getDefault().error(...args),
  flush: () => getDefault().flush(),
  shutdown: () => getDefault().shutdown(),
}
