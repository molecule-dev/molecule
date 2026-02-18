/**
 * Mock logger implementation for testing.
 *
 * @module
 */

import type { Logger } from '@molecule/api-logger'

/**
 * Log entry captured by the mock logger.
 */
export interface LogEntry {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  message: string
  args: unknown[]
  timestamp: Date
}

/**
 * Creates a mock Logger that captures all log entries for assertions.
 * @returns A Logger with exposed `logs` array, `reset()`, and `getLogsByLevel()` for test inspection.
 */
export const createMockLogger = (): Logger & {
  logs: LogEntry[]
  reset: () => void
  getLogsByLevel: (level: LogEntry['level']) => LogEntry[]
  setLevel: (level: string) => void
  getLevel: () => string
} => {
  const logs: LogEntry[] = []

  const log =
    (level: LogEntry['level']) =>
    (message: string, ...args: unknown[]) => {
      logs.push({
        level,
        message,
        args,
        timestamp: new Date(),
      })
    }

  return {
    logs,

    reset(): void {
      logs.length = 0
    },

    getLogsByLevel(level: LogEntry['level']): LogEntry[] {
      return logs.filter((l) => l.level === level)
    },

    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),

    setLevel(): void {},
    getLevel(): string {
      return 'trace'
    },
  }
}

/** Pre-configured mock logger instance for quick test setup. */
export const mockLogger = createMockLogger()
