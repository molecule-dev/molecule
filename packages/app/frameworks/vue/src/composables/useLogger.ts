/**
 * Vue composable for logging.
 *
 * @module
 */

import { inject } from 'vue'

import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'

import { LoggerKey } from '../injection-keys.js'

/**
 * Composable to access the logger provider from injection.
 *
 * @returns The logger provider
 * @throws {Error} Error if used without providing logger
 */
export function useLoggerProvider(): LoggerProvider {
  const provider = inject(LoggerKey)
  if (!provider) {
    throw new Error('useLoggerProvider requires LoggerProvider to be provided')
  }
  return provider
}

/**
 * Composable to get a logger instance.
 *
 * @param name - Logger name (usually component name)
 * @param config - Optional logger configuration
 * @returns Logger instance
 *
 * @example
 * ```vue
 * <script setup>
 * import { useLogger } from '`@molecule/app-vue`'
 * import { onMounted, onUnmounted } from 'vue'
 *
 * const logger = useLogger('MyComponent')
 *
 * onMounted(() => {
 *   logger.info('Component mounted')
 * })
 *
 * onUnmounted(() => {
 *   logger.info('Component unmounting')
 * })
 *
 * function handleError(error) {
 *   logger.error('Operation failed', error)
 * }
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
 * Composable to get the root logger.
 *
 * @returns Root logger instance
 */
export function useRootLogger(): Logger {
  const provider = useLoggerProvider()
  return provider.getLogger()
}

/**
 * Composable to create a child logger with additional context.
 *
 * @param parentName - Parent logger name
 * @param context - Additional context
 * @returns Child logger instance
 */
export function useChildLogger(parentName: string, context: Record<string, unknown>): Logger {
  const provider = useLoggerProvider()
  const parent = provider.getLogger(parentName)
  return parent.withContext(context)
}
