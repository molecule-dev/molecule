/**
 * React hook for logging.
 *
 * @module
 */

import { useContext, useMemo } from 'react'

import { t } from '@molecule/app-i18n'
import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'

import { LoggerContext } from '../contexts.js'

/**
 * Hook to access the logger provider from context.
 *
 * @returns The logger provider from context
 * @throws {Error} Error if used outside of LoggerProvider
 */
export function useLoggerProvider(): LoggerProvider {
  const provider = useContext(LoggerContext)
  if (!provider) {
    throw new Error(
      t('react.error.useLoggerOutsideProvider', undefined, {
        defaultValue: 'useLoggerProvider must be used within a LoggerProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook to get a logger instance.
 *
 * @param name - Logger name (usually component or module name)
 * @param config - Optional logger configuration
 * @returns Logger instance
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const logger = useLogger('UserProfile')
 *
 *   useEffect(() => {
 *     logger.info('Component mounted')
 *     return () => logger.info('Component unmounting')
 *   }, [])
 *
 *   const handleError = (error: Error) => {
 *     logger.error('Failed to load user', error)
 *   }
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useLogger(name: string, config?: Partial<LoggerConfig>): Logger {
  const provider = useLoggerProvider()

  return useMemo(() => {
    if (config) {
      return provider.createLogger({ name, ...config })
    }
    return provider.getLogger(name)
  }, [provider, name, config])
}

/**
 * Hook to get the root logger.
 *
 * @returns Root logger instance
 */
export function useRootLogger(): Logger {
  const provider = useLoggerProvider()
  return useMemo(() => provider.getLogger(), [provider])
}

/**
 * Hook to create a child logger with additional context.
 *
 * @param parentName - Parent logger name
 * @param context - Additional context to include in logs
 * @returns Child logger instance
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const logger = useChildLogger('UserList', { component: 'UserList' })
 *
 *   const handleUserClick = (userId: string) => {
 *     // Logs will include { component: 'UserList', userId }
 *     logger.withContext({ userId }).info('User clicked')
 *   }
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useChildLogger(parentName: string, context: Record<string, unknown>): Logger {
  const provider = useLoggerProvider()

  return useMemo(() => {
    const parent = provider.getLogger(parentName)
    return parent.withContext(context)
  }, [provider, parentName, context])
}
