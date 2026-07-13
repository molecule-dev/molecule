/**
 * Pino logger provider implementation.
 *
 * Provides a high-performance logger implementation using pino.
 *
 * @see https://www.npmjs.com/package/pino
 *
 * @module
 */

import { format } from 'node:util'

import pino from 'pino'

import type { Logger, LogLevel } from '@molecule/api-logger'

import type { PinoLoggerOptions } from './types.js'

/**
 * Map molecule log levels to pino levels.
 */
const levelMap: Record<LogLevel, string> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  silent: 'silent',
}

/**
 * Bridges the console-style variadic `Logger` contract onto pino's
 * `(mergingObject?, message?)` call shape.
 *
 * The `Logger` contract is console-like — `logger.info('Server started on
 * port', 3000)`, `logger.error('failed', error)` — but pino is printf-like:
 * it DROPS extra arguments that have no `%s`/`%d` placeholder, and it treats
 * a non-string first argument as the merging object. Passing the raw args
 * array through (the old behavior) produced message-less `{"0":…,"1":…}`
 * records, and an `Error` in any secondary position serialized to `{}`
 * (Errors have no enumerable properties) — message AND stack both lost.
 *
 * Mapping (each rule verified against real pino):
 * - `(message, contextObjectOrError)` → `write(objOrErr, message)` — pino's
 *   native shape: plain objects merge into the record, Errors serialize under
 *   `err` with their stack.
 * - `(objectOrError, ...messageParts)` → `write(objOrErr, format(...parts))`.
 * - anything else → `write(format(...args))` — console semantics (stacks and
 *   inspected objects included in the message text).
 *
 * @param write - The level-bound pino log function.
 * @returns A console-style variadic log function.
 */
const emit =
  (write: (obj: unknown, msg?: string) => void) =>
  (...args: unknown[]): void => {
    if (args.length === 0) return
    if (args.length === 1) {
      write(args[0])
      return
    }
    const [first, ...rest] = args
    if (
      typeof first === 'string' &&
      rest.length === 1 &&
      typeof rest[0] === 'object' &&
      rest[0] !== null
    ) {
      write(rest[0], first)
      return
    }
    if (typeof first === 'object' && first !== null) {
      write(first, format(...rest))
      return
    }
    write(format(...args))
  }

/** The molecule log-method names a pino instance shares. */
type LevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error'

/**
 * Builds the console-style log function for one level of a pino instance.
 *
 * @param instance - The pino instance to write through.
 * @param level - The level method to bind.
 * @returns A console-style variadic log function for that level.
 */
const forward = (instance: pino.Logger, level: LevelName): ((...args: unknown[]) => void) =>
  emit((obj, msg) => {
    if (msg === undefined) instance[level](obj)
    else instance[level](obj, msg)
  })

/**
 * Wraps a pino instance in the molecule `Logger` interface.
 *
 * @param instance - The pino instance to wrap.
 * @returns A `Logger` whose methods bridge console-style args onto pino.
 */
const toLogger = (instance: pino.Logger): Logger => ({
  trace: forward(instance, 'trace'),
  debug: forward(instance, 'debug'),
  info: forward(instance, 'info'),
  warn: forward(instance, 'warn'),
  error: forward(instance, 'error'),
})

/**
 * Builds the underlying pino instance for the given options.
 *
 * @param options - Pino configuration (log level, name, pretty mode, transport, destination).
 * @returns The configured pino instance.
 */
const createInstance = (options?: PinoLoggerOptions): pino.Logger => {
  const level = options?.level ? levelMap[options.level] : 'info'

  // An explicit destination is the most specific intent — it wins over
  // pretty/transport (pino forbids combining a transport with a stream).
  if (options?.destination) {
    return pino({ level, name: options.name }, options.destination)
  }

  let transport: pino.TransportSingleOptions | pino.TransportMultiOptions | undefined
  if (options?.pretty) {
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    }
  } else if (options?.transport) {
    transport = options.transport as pino.TransportSingleOptions | pino.TransportMultiOptions
  }

  return pino({
    level,
    name: options?.name,
    transport,
  })
}

/**
 * Creates a pino-based logger that implements the `Logger` interface.
 * Supports pretty-printing, custom transports, and a custom destination
 * stream (useful for tests and in-process sinks).
 *
 * @param options - Pino configuration (log level, name, pretty mode, transport, destination).
 * @returns A `Logger` backed by pino.
 */
export const createLogger = (options?: PinoLoggerOptions): Logger =>
  toLogger(createInstance(options))

/** The lazily-created shared pino instance backing `provider` and `createChildLogger`. */
let defaultInstance: pino.Logger | null = null

/**
 * Returns the shared default pino instance, creating it on first use.
 *
 * Lazy so that merely importing this package never spawns the pino-pretty
 * transport worker thread (pretty mode is enabled outside production, and
 * `NODE_ENV` is read at first log call rather than at import time).
 *
 * @returns The shared default pino instance.
 */
const getDefaultInstance = (): pino.Logger => {
  if (!defaultInstance) {
    // 'trace' = pass everything through: minimum-level filtering happens once,
    // in `@molecule/api-logger` (LOG_LEVEL / setLevel(), default 'info'). A
    // second gate here would make the core's setLevel('debug') silently no-op.
    defaultInstance = createInstance({
      level: 'trace',
      pretty: process.env.NODE_ENV !== 'production',
    })
  }
  return defaultInstance
}

/**
 * The default pino logger, with pretty-printing enabled outside production.
 * Level filtering is delegated to `@molecule/api-logger`'s gate — the
 * underlying instance emits everything it is handed.
 */
export const provider: Logger = {
  trace: (...args) => forward(getDefaultInstance(), 'trace')(...args),
  debug: (...args) => forward(getDefaultInstance(), 'debug')(...args),
  info: (...args) => forward(getDefaultInstance(), 'info')(...args),
  warn: (...args) => forward(getDefaultInstance(), 'warn')(...args),
  error: (...args) => forward(getDefaultInstance(), 'error')(...args),
}

/**
 * Creates a child pino logger with additional context bindings
 * (e.g. `{ requestId: '...', userId: '...' }`).
 *
 * The child derives from the same shared instance that backs `provider`, so
 * it truly inherits the default configuration (pretty mode, level).
 *
 * @param bindings - Key-value pairs to include in every log entry from this child.
 * @returns A `Logger` that inherits the default configuration with added context.
 */
export const createChildLogger = (bindings: Record<string, unknown>): Logger =>
  toLogger(getDefaultInstance().child(bindings))
