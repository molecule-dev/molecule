/**
 * Utility functions for the logger module.
 *
 * @module
 */

import type { LogEntry, LogLevel, LogTransport } from './types.js'
import { LOG_LEVEL_PRIORITY } from './types.js'

/**
 * Default log format: `"ISO_TIMESTAMP LEVEL[name]: message"`.
 *
 * @param entry - The log entry to format.
 * @returns The formatted log string.
 */
export const defaultFormat = (entry: LogEntry): string => {
  const prefix = entry.logger ? `[${entry.logger}]` : ''
  const timestamp = entry.timestamp.toISOString()
  return `${timestamp} ${entry.level.toUpperCase()}${prefix}: ${entry.message}`
}

/**
 * Creates a remote logging transport that batches log entries and
 * sends them to a remote endpoint via HTTP POST.
 *
 * @param options - Transport configuration.
 * @param options.url - The remote endpoint URL to POST log batches to.
 * @param options.minLevel - Minimum log level to send (default: `'warn'`).
 * @param options.batchSize - Number of entries to buffer before flushing (default: 10).
 * @param options.flushInterval - Milliseconds between automatic flushes (default: 5000).
 * @param options.headers - Additional HTTP headers for the POST request.
 * @returns A `LogTransport` function that buffers and sends entries.
 */
export const createRemoteTransport = (options: {
  url: string
  minLevel?: LogLevel
  batchSize?: number
  flushInterval?: number
  headers?: Record<string, string>
}): LogTransport => {
  const { url, minLevel = 'warn', batchSize = 10, flushInterval = 5000, headers = {} } = options
  const buffer: LogEntry[] = []
  let flushTimeout: NodeJS.Timeout | null = null

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) return

    const entries = buffer.splice(0, buffer.length)

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ logs: entries }),
      })
    } catch {
      // Silently fail for remote logging
    }
  }

  const scheduleFlush = (): void => {
    if (flushTimeout) return

    flushTimeout = setTimeout(() => {
      flushTimeout = null
      flush()
    }, flushInterval)
  }

  return (entry: LogEntry) => {
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[minLevel]) {
      return
    }

    buffer.push(entry)

    if (buffer.length >= batchSize) {
      flush()
    } else {
      scheduleFlush()
    }
  }
}
