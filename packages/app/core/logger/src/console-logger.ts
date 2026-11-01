/**
 * Console-based logger implementation.
 *
 * @module
 */

import { errorFromSnapshot } from './error-snapshot.js'
import { snapshotCredentials } from './redaction.js'
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
    args: unknown[],
    errorArgument = false,
  ): void => {
    if (!shouldLog(entryLevel)) return

    // Which top-level arguments are errors, read before the snapshot replaces them with plain data.
    const errorPositions = args.map(
      (arg) =>
        arg instanceof Error ||
        (typeof DOMException !== 'undefined' && arg instanceof DOMException),
    )

    // Capture the complete entry as a fresh scrubbed tree BEFORE console or any transport can
    // retain it. Later caller mutation therefore cannot change a buffered clean entry into a leak.
    const entry = snapshotCredentials<LogEntry>({
      level: entryLevel,
      message,
      args,
      timestamp: new Date(),
      logger: name,
      context: Object.keys(context).length > 0 ? context : undefined,
    })

    if (errorArgument && entry.args.length > 0) {
      const errorData = entry.args[0]
      if (errorData && typeof errorData === 'object' && 'message' in errorData) {
        entry.message = String((errorData as { message: unknown }).message)
      }
    }
    // Console readers retain Error-shaped arguments in every position (`error(msg, err)` included),
    // rebuilt only from detached data.
    const consoleArgs = entry.args.map((arg, index) =>
      errorPositions[index] ? errorFromSnapshot(arg) : arg,
    )
    const consoleMethod = entryLevel === 'trace' ? 'debug' : entryLevel
    const formatted = showTimestamps ? format(entry) : entry.message
    const prefix = entry.logger && !showTimestamps ? `[${entry.logger}]` : ''

    if (prefix) {
      console[consoleMethod](prefix, formatted, ...consoleArgs)
    } else {
      console[consoleMethod](formatted, ...consoleArgs)
    }

    // Send to transports
    transports.forEach((transport) => {
      try {
        transport(entry)
      } catch (_error) {
        // Intentional noop: a failing transport must not disrupt the logger or
        // other transports — transports are best-effort side-channels.
      }
    })
  }

  const logger: Logger = {
    trace: (message, ...args) => log('trace', message, args),
    debug: (message, ...args) => log('debug', message, args),
    info: (message, ...args) => log('info', message, args),
    warn: (message, ...args) => log('warn', message, args),
    error: (message, ...args) => {
      const errorArgument = message instanceof Error
      const errorArgs = errorArgument ? [message, ...args] : args
      log('error', errorArgument ? '' : message, errorArgs, errorArgument)
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
