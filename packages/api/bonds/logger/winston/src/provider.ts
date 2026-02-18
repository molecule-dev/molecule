/**
 * Winston logger provider implementation.
 *
 * Provides a full-featured logger implementation using winston.
 *
 * @see https://www.npmjs.com/package/winston
 *
 * @module
 */

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
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} ${level}: ${message}${metaStr}`
  }),
)

/**
 * Maps a molecule `WinstonTransportConfig` to a winston transport instance.
 *
 * @param config - Transport configuration specifying type (console, file, http) and options.
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
    default:
      return new winston.transports.Console(opts)
  }
}

/**
 * Creates a winston-based logger that implements the `Logger` interface.
 * Supports console, file, and HTTP transports.
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
    trace: (...args) => instance.silly(args.map(String).join(' ')),
    debug: (...args) => instance.debug(args.map(String).join(' ')),
    info: (...args) => instance.info(args.map(String).join(' ')),
    warn: (...args) => instance.warn(args.map(String).join(' ')),
    error: (...args) => instance.error(args.map(String).join(' ')),
  }
}

/**
 * The default winston logger with console format.
 */
export const provider: Logger = createLogger({ format: 'console' })
