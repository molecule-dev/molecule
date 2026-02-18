/**
 * Svelte utilities for logging.
 *
 * @module
 */

import type { Logger, LoggerConfig, LoggerProvider, LogLevel } from '@molecule/app-logger'

import { getLoggerProvider } from '../context.js'

/**
 * Logger helper functions.
 */
interface LoggerHelpers {
  getLogger: (name?: string) => Logger
  createLogger: (config: LoggerConfig) => Logger
  setLevel: (level: LogLevel) => void
  getLevel: () => LogLevel
  enable: () => void
  disable: () => void
  isEnabled: () => boolean
}

/**
 * Get a logger instance.
 *
 * @param name - Logger name
 * @returns Logger instance
 *
 * @example
 * ```svelte
 * <script>
 *   import { getLogger } from '`@molecule/app-svelte`'
 *   import { onMount, onDestroy } from 'svelte'
 *
 *   const logger = getLogger('MyComponent')
 *
 *   onMount(() => {
 *     logger.info('Component mounted')
 *   })
 *
 *   onDestroy(() => {
 *     logger.debug('Component destroyed')
 *   })
 *
 *   function handleError(error) {
 *     logger.error('Operation failed', error)
 *   }
 * </script>
 * ```
 */
export function getLogger(name?: string): Logger {
  const provider = getLoggerProvider()
  return provider.getLogger(name)
}

/**
 * Create a logger with custom configuration.
 *
 * @param config - Logger configuration
 * @returns Logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
  const provider = getLoggerProvider()
  return provider.createLogger(config)
}

/**
 * Get the root logger.
 *
 * @returns Root logger instance
 */
export function getRootLogger(): Logger {
  const provider = getLoggerProvider()
  return provider.getLogger()
}

/**
 * Create a child logger with additional context.
 *
 * @param name - Parent logger name
 * @param context - Additional context
 * @returns Child logger instance
 */
export function getChildLogger(name: string, context: Record<string, unknown>): Logger {
  const provider = getLoggerProvider()
  const parent = provider.getLogger(name)
  return parent.withContext(context)
}

/**
 * Create logger helpers from context.
 *
 * @returns Logger helper functions
 */
export function createLoggerHelpers(): LoggerHelpers {
  const provider = getLoggerProvider()

  return {
    getLogger: (name?: string) => provider.getLogger(name),
    createLogger: (config: LoggerConfig) => provider.createLogger(config),
    setLevel: (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') =>
      provider.setLevel(level),
    getLevel: () => provider.getLevel(),
    enable: () => provider.enable(),
    disable: () => provider.disable(),
    isEnabled: () => provider.isEnabled(),
  }
}

/**
 * Create logger helpers from a specific provider.
 *
 * @param provider - Logger provider
 * @returns Logger helper functions
 */
export function createLoggerHelpersFromProvider(provider: LoggerProvider): LoggerHelpers {
  return {
    getLogger: (name?: string) => provider.getLogger(name),
    createLogger: (config: LoggerConfig) => provider.createLogger(config),
    setLevel: (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') =>
      provider.setLevel(level),
    getLevel: () => provider.getLevel(),
    enable: () => provider.enable(),
    disable: () => provider.disable(),
    isEnabled: () => provider.isEnabled(),
  }
}
