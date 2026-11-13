/**
 * Svelte hooks for logging, porting React's `useLogger` family.
 *
 * @module
 */

import type { Logger, LoggerConfig } from '@molecule/app-logger'

import { useLoggerProvider } from '../context.js'

/**
 * Gets a logger instance, React's `useLogger` in Svelte's idiom: called during
 * component init under `setMoleculeContext`, it returns the logger itself (a
 * plain object — there is nothing reactive in a logger).
 *
 * @param name - Logger name (usually component or module name).
 * @param config - Optional logger configuration.
 * @returns Logger instance.
 * @throws {Error} If no logger provider has been set in context.
 * @example
 * ```svelte
 * <script>
 *   import { useLogger } from '@molecule/app-svelte'
 *   const logger = useLogger('UserProfile')
 *   logger.info('Component mounted')
 * </script>
 * ```
 */
export function useLogger(name: string, config?: Partial<LoggerConfig>): Logger {
  const provider = useLoggerProvider()
  if (config) {
    return provider.createLogger({ name, ...config })
  }
  return provider.getLogger(name)
}

/**
 * Gets the root logger, React's `useRootLogger` in Svelte's idiom: called
 * during component init under `setMoleculeContext`.
 *
 * @returns Root logger instance.
 * @throws {Error} If no logger provider has been set in context.
 */
export function useRootLogger(): Logger {
  const provider = useLoggerProvider()
  return provider.getLogger()
}

/**
 * Creates a child logger with additional context, React's `useChildLogger` in
 * Svelte's idiom: called during component init under `setMoleculeContext`.
 *
 * @param parentName - Parent logger name.
 * @param context - Additional context to include in logs.
 * @returns Child logger instance.
 * @throws {Error} If no logger provider has been set in context.
 * @example
 * ```svelte
 * <script>
 *   import { useChildLogger } from '@molecule/app-svelte'
 *   const logger = useChildLogger('UserList', { component: 'UserList' })
 *   logger.withContext({ userId }).info('User clicked')
 * </script>
 * ```
 */
export function useChildLogger(parentName: string, context: Record<string, unknown>): Logger {
  const provider = useLoggerProvider()
  const parent = provider.getLogger(parentName)
  return parent.withContext(context)
}
