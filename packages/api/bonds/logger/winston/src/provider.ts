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
 * Map molecule log levels to winston's built-in npm levels. `'silent'` is
 * deliberately excluded — winston has NO built-in 'silent' level, so it is
 * implemented separately via the supported `silent: true` flag (see
 * `resolveWinstonLevel`), not by indexing this map with an unknown level name.
 */
const levelMap: Record<Exclude<LogLevel, 'silent'>, string> = {
  trace: 'silly',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
}

/**
 * Resolves the winston `{ level, silent }` pair for an omittable molecule
 * `LogLevel`.
 *
 * - Omitted (`undefined`) resolves to `'silly'` — winston's most-verbose
 *   level, i.e. pass-through. Minimum-level filtering is meant to happen
 *   once, in `@molecule/api-logger`'s gate (`LOG_LEVEL` / `setLevel()`); a
 *   stricter default here would be a second, hidden gate that makes the
 *   core's `setLevel('debug')` silently no-op for a level-less instance.
 * - `'silent'` resolves via the documented `silent: true` flag (which
 *   `_transform`/`_write` check FIRST and unconditionally skip writing),
 *   rather than setting `level: 'silent'` — winston has no such level, so
 *   that string previously silenced output only because every priority
 *   comparison against an unknown level name happens to evaluate to `false`.
 *   That was verified correct against pinned winston 3.19.0, but it is
 *   latent drift risk (undocumented, not guaranteed) if winston ever starts
 *   validating level names. `silent: true` is winston's actual supported
 *   mechanism for "log nothing".
 *
 * @param level - The molecule log level, or `undefined` to pass everything through.
 * @returns The winston `level` string and `silent` flag to configure.
 */
const resolveWinstonLevel = (level?: LogLevel): { level: string; silent: boolean } => {
  if (level === 'silent') return { level: 'silly', silent: true }
  return { level: level ? levelMap[level] : 'silly', silent: false }
}

/**
 * Serializes Error instances carried in the `error` / `err` meta keys.
 *
 * The molecule logging convention is `logger.error('what failed', { error })`.
 * Winston's own `errors({ stack: true })` format only preserves the stack when
 * the logged ENTRY itself is an Error — a nested `error: Error` meta value
 * JSON-serializes to `{}` (Errors have no enumerable properties) and the stack
 * is silently lost. This format runs first in both pipelines and converts such
 * values to plain `{ type, message, stack }` objects.
 */
const serializeMetaErrors = winston.format((info) => {
  for (const key of ['error', 'err'] as const) {
    const value = info[key]
    if (value instanceof Error) {
      info[key] = { type: value.name, message: value.message, stack: value.stack }
    }
  }
  return info
})

/** Default winston format: JSON with timestamps and error stack traces. */
const defaultFormat = winston.format.combine(
  serializeMetaErrors(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

/** Colorized console format for development with `HH:mm:ss` timestamps. */
const consoleFormat = winston.format.combine(
  serializeMetaErrors(),
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
  // `config.level` omitted → no override (`level`/`silent` both undefined), so
  // the transport inherits the parent logger's level, per winston's own
  // fallback (`this.level || this.parent.level`). Only an EXPLICIT
  // `config.level` resolves to a concrete `{ level, silent }` pair.
  const resolved = config.level ? resolveWinstonLevel(config.level) : undefined
  const opts = {
    ...config.options,
    level: resolved?.level,
    silent: resolved?.silent,
  } as Record<string, unknown>

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
  const { level, silent } = resolveWinstonLevel(options?.level)
  const format = options?.format === 'console' ? consoleFormat : defaultFormat

  const transports = options?.transports
    ? options.transports.map(mapTransport)
    : [new winston.transports.Console()]

  const instance = winston.createLogger({
    level,
    silent,
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
