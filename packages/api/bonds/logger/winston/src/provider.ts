/**
 * Winston logger provider implementation.
 *
 * Provides a full-featured logger implementation using winston.
 *
 * @see https://www.npmjs.com/package/winston
 *
 * @module
 */

import { format as utilFormat } from 'node:util'

import winston from 'winston'

import type { Logger, LogLevel } from '@molecule/api-logger'

import type { WinstonLoggerOptions, WinstonTransportConfig } from './types.js'

/**
 * Map molecule log levels to winston levels.
 */
const levelMap: Record<LogLevel, string> = {
  trace: 'silly',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  // winston has NO built-in 'silent' level. An unknown level name makes every
  // priority comparison false, which silences all output — verified against
  // the pinned winston 3.x and covered by the unit suite; if winston ever
  // starts validating level names, map this to `logger.silent = true` instead.
  silent: 'silent',
}

/** Default winston format: JSON with timestamps and error stack traces. */
const defaultFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

/** Colorized console format for development with `HH:mm:ss` timestamps. */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  // Without errors({stack}), a logged Error's stack silently vanishes from
  // console output (only the message survives) — the one detail a debugger needs.
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    const stackStr = stack ? `\n${stack}` : ''
    return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`
  }),
)

/**
 * Maps a molecule `WinstonTransportConfig` to a winston transport instance.
 *
 * @param config - Transport configuration specifying type (console, file, http, stream) and options.
 * @returns A winston transport instance.
 */
const mapTransport = (config: WinstonTransportConfig): winston.transport => {
  const level = config.level ? levelMap[config.level] : undefined
  const opts = { ...config.options, level } as Record<string, unknown>

  switch (config.type) {
    case 'console':
      return new winston.transports.Console(opts)
    case 'file':
      return new winston.transports.File(opts as winston.transports.FileTransportOptions)
    case 'http':
      return new winston.transports.Http(opts as winston.transports.HttpTransportOptions)
    case 'stream': {
      // StreamTransportOptions requires a real stream — fail with an actionable
      // message instead of letting winston throw an opaque one downstream.
      const { stream, ...rest } = opts
      if (!stream || typeof (stream as { write?: unknown }).write !== 'function') {
        throw new Error(
          "winston 'stream' transport requires options.stream (a writable stream with a write() method).",
        )
      }
      return new winston.transports.Stream({
        ...rest,
        stream: stream as NodeJS.WritableStream,
      })
    }
    default:
      return new winston.transports.Console(opts)
  }
}

/**
 * Bridges the console-style variadic `Logger` contract onto winston's
 * `(message, ...meta)` call shape.
 *
 * The old bridge stringified every argument (`args.map(String).join(' ')`),
 * which destroyed exactly what winston exists to keep: a context object became
 * `[object Object]` and an `Error` collapsed to its message — the stack was
 * lost even though the format declares `errors({ stack: true })`. Mapping
 * (each rule verified against real winston):
 *
 * - a single `Error` → `write(err)` — the errors format keeps message + stack.
 * - `(message, contextObjectOrError)` → `write(message, objOrErr)` — plain
 *   objects merge into the record as meta; an Error contributes its stack.
 * - anything else → `write(format(...args))` — console semantics (stacks and
 *   inspected objects included in the message text).
 *
 * @param write - The level-bound winston log method.
 * @returns A console-style variadic log function.
 */
const emit =
  (write: winston.LeveledLogMethod) =>
  (...args: unknown[]): void => {
    if (args.length === 0) return
    if (args.length === 1 && args[0] instanceof Error) {
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
      write(first, rest[0])
      return
    }
    write(utilFormat(...args))
  }

/**
 * Creates a winston-based logger that implements the `Logger` interface.
 * Supports console, file, HTTP, and stream transports.
 *
 * @param options - Winston configuration (log level, format, transports).
 * @returns A `Logger` backed by winston.
 */
export const createLogger = (options?: WinstonLoggerOptions): Logger => {
  const level = options?.level ? levelMap[options.level] : 'info'
  const format = options?.format === 'console' ? consoleFormat : defaultFormat

  const transports = options?.transports
    ? options.transports.map(mapTransport)
    : [new winston.transports.Console()]

  const instance = winston.createLogger({
    level,
    format,
    transports,
  })

  return {
    trace: emit(instance.silly.bind(instance)),
    debug: emit(instance.debug.bind(instance)),
    info: emit(instance.info.bind(instance)),
    warn: emit(instance.warn.bind(instance)),
    error: emit(instance.error.bind(instance)),
  }
}

/**
 * The default winston logger with console format.
 *
 * Level filtering is delegated to `@molecule/api-logger`'s gate (`LOG_LEVEL` /
 * `setLevel()`, default `'info'`) — the underlying instance passes everything
 * through so the core's single gate governs; a second gate here would make the
 * core's `setLevel('debug')` silently no-op.
 */
export const provider: Logger = createLogger({ format: 'console', level: 'trace' })
