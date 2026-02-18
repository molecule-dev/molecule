/**
 * Solid.js primitives for logging.
 *
 * @module
 */

import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'

import { getLoggerProvider } from '../context.js'

/**
 * Get a logger instance.
 *
 * @param name - Logger name
 * @returns Logger instance
 *
 * @example
 * ```tsx
 * import { getLogger } from '`@molecule/app-solid`'
 * import { onMount, onCleanup } from 'solid-js'
 *
 * function MyComponent() {
 *   const logger = getLogger('MyComponent')
 *
 *   onMount(() => {
 *     logger.info('Component mounted')
 *   })
 *
 *   onCleanup(() => {
 *     logger.debug('Component unmounted')
 *   })
 *
 *   const handleError = (error: Error) => {
 *     logger.error('Operation failed', error)
 *   }
 *
 *   return <div>...</div>
 * }
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
 *
 * @example
 * ```tsx
 * const logger = createLogger({
 *   name: 'API',
 *   level: 'debug',
 *   context: { module: 'api' },
 * })
 * ```
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
 *
 * @example
 * ```tsx
 * function UserProfile(props: { userId: string }) {
 *   const logger = getChildLogger('UserProfile', { userId: props.userId })
 *   // All logs will include userId in context
 *   logger.info('Profile loaded')
 * }
 * ```
 */
export function getChildLogger(name: string, context: Record<string, unknown>): Logger {
  const provider = getLoggerProvider()
  const parent = provider.getLogger(name)
  return parent.withContext(context)
}

/**
 * Create a component logger that includes component name in context.
 *
 * @param componentName - Name of the component
 * @returns Logger configured for the component
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const logger = useComponentLogger('Dashboard')
 *
 *   const handleRefresh = () => {
 *     logger.info('Dashboard refreshed')
 *   }
 *
 *   return <button onClick={handleRefresh}>Refresh</button>
 * }
 * ```
 */
export function useComponentLogger(componentName: string): Logger {
  return getLogger(componentName)
}

/**
 * Create logger helpers from context.
 *
 * @returns Logger helper functions
 */

/**
 * Creates a logger helpers.
 * @returns The created result.
 */
export function createLoggerHelpers(): {
  getLogger: (name?: string) => Logger
  createLogger: (config: LoggerConfig) => Logger
  setLevel: (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => void
  getLevel: () => string
  enable: () => void
  disable: () => void
  isEnabled: () => boolean
} {
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

/**
 * Creates a logger helpers from provider.
 * @param provider - The provider implementation.
 * @returns The created result.
 */
export function createLoggerHelpersFromProvider(provider: LoggerProvider): {
  getLogger: (name?: string) => Logger
  createLogger: (config: LoggerConfig) => Logger
  setLevel: (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => void
  getLevel: () => string
  enable: () => void
  disable: () => void
  isEnabled: () => boolean
} {
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
 * Create logger from a specific provider.
 *
 * @param provider - Logger provider
 * @param name - Logger name
 * @returns Logger instance
 */
export function createLoggerFromProvider(provider: LoggerProvider, name?: string): Logger {
  return provider.getLogger(name)
}
