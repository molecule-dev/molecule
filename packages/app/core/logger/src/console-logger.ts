/**
 * Console-based logger implementation.
 *
 * @module
 */

import type { LogEntry, Logger, LoggerConfig, LogLevel, LogTransport } from './types.js'
import { LOG_LEVEL_PRIORITY } from './types.js'
import { defaultFormat } from './utilities.js'

/**
 * Creates a console-based logger that outputs to `console.*` methods
 * and dispatches entries to registered transports.
 *
 * @param config - Logger configuration (level, name, transports, format).
 * @returns A `Logger` instance backed by the browser/Node console.
 */
export const createConsoleLogger = (config: LoggerConfig = {}): Logger => {
  let level = config.level || 'info'
  const name = config.name
  const transports = new Set<LogTransport>(config.transports || [])
  let context = config.context || {}
  const format = config.format || defaultFormat
  const showTimestamps = config.timestamps ?? false

  const shouldLog = (entryLevel: Exclude<LogLevel, 'silent'>): boolean => {
    return LOG_LEVEL_PRIORITY[entryLevel] >= LOG_LEVEL_PRIORITY[level]
  }

  const log = (
    entryLevel: Exclude<LogLevel, 'silent'>,
    message: string,
    ...args: unknown[]
  ): void => {
    if (!shouldLog(entryLevel)) return

    const entry: LogEntry = {
      level: entryLevel,
      message,
      args,
      timestamp: new Date(),
      logger: name,
      context: Object.keys(context).length > 0 ? context : undefined,
    }

    // Console output
    const consoleMethod = entryLevel === 'trace' ? 'debug' : entryLevel
    const formatted = showTimestamps ? format(entry) : message
    const prefix = name && !showTimestamps ? `[${name}]` : ''

    if (prefix) {
      console[consoleMethod](prefix, formatted, ...args)
    } else {
      console[consoleMethod](formatted, ...args)
    }

    // Send to transports
    transports.forEach((transport) => {
      try {
        transport(entry)
      } catch {
        // Ignore transport errors
      }
    })
  }

  const logger: Logger = {
    trace: (message, ...args) => log('trace', message, ...args),
    debug: (message, ...args) => log('debug', message, ...args),
    info: (message, ...args) => log('info', message, ...args),
    warn: (message, ...args) => log('warn', message, ...args),
    error: (message, ...args) => {
      const msg = message instanceof Error ? message.message : message
      const errorArgs = message instanceof Error ? [message, ...args] : args
      log('error', msg, ...errorArgs)
    },

    setLevel: (newLevel) => {
      level = newLevel
    },

    getLevel: () => level,

    child: (childName, childContext) => {
      const fullName = name ? `${name}:${childName}` : childName
      return createConsoleLogger({
        ...config,
        name: fullName,
        level,
        context: { ...context, ...childContext },
        transports: Array.from(transports),
      })
    },

    withContext: (newContext) => {
      context = { ...context, ...newContext }
      return logger
    },

    addTransport: (transport) => {
      transports.add(transport)
      return () => transports.delete(transport)
    },

    removeTransport: (transport) => {
      transports.delete(transport)
    },
  }

  return logger
}
