/**
 * Pino logger provider implementation.
 *
 * Provides a high-performance logger implementation using pino.
 *
 * @see https://www.npmjs.com/package/pino
 *
 * @module
 */

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
 * Creates a pino-based logger that implements the `Logger` interface.
 * Supports pretty-printing and custom transports.
 *
 * @param options - Pino configuration (log level, name, pretty mode, transport).
 * @returns A `Logger` backed by pino.
 */
export const createLogger = (options?: PinoLoggerOptions): Logger => {
  const level = options?.level ? levelMap[options.level] : 'info'

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

  const instance = pino({
    level,
    name: options?.name,
    transport,
  })

  return {
    trace: (...args) => instance.trace(args.length === 1 ? args[0] : args),
    debug: (...args) => instance.debug(args.length === 1 ? args[0] : args),
    info: (...args) => instance.info(args.length === 1 ? args[0] : args),
    warn: (...args) => instance.warn(args.length === 1 ? args[0] : args),
    error: (...args) => instance.error(args.length === 1 ? args[0] : args),
  }
}

/**
 * The default pino logger, with pretty-printing enabled outside production.
 */
export const provider: Logger = createLogger({ pretty: process.env.NODE_ENV !== 'production' })

/**
 * Creates a child pino logger with additional context bindings
 * (e.g. `{ requestId: '...', userId: '...' }`).
 *
 * @param bindings - Key-value pairs to include in every log entry from this child.
 * @returns A `Logger` that inherits the parent's configuration with added context.
 */
export const createChildLogger = (bindings: Record<string, unknown>): Logger => {
  const instance = pino().child(bindings)

  return {
    trace: (...args) => instance.trace(args.length === 1 ? args[0] : args),
    debug: (...args) => instance.debug(args.length === 1 ? args[0] : args),
    info: (...args) => instance.info(args.length === 1 ? args[0] : args),
    warn: (...args) => instance.warn(args.length === 1 ? args[0] : args),
    error: (...args) => instance.error(args.length === 1 ? args[0] : args),
  }
}
