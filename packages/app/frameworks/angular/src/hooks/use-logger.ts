/**
 * Angular functions for loggers, mirroring `useLogger`, `useLoggerProvider`,
 * `useRootLogger` and `useChildLogger` from `@molecule/app-react`.
 *
 * @module
 */

import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'

import { injectProvider } from '../inject.js'
import { LOGGER_PROVIDER } from '../tokens.js'

/**
 * The logger provider registered by `provideMolecule({ logger })` or
 * `provideLogger`. Call it in an injection context.
 *
 * @returns The logger provider.
 * @throws {Error} When no logger provider is registered.
 */
export function useLoggerProvider(): LoggerProvider {
  return injectProvider(
    LOGGER_PROVIDER,
    'useLoggerOutsideProvider',
    'useLoggerProvider must be used within a LoggerProvider',
  )
}

/**
 * A named logger from the registered provider. Call it in an injection
 * context.
 *
 * @param name - Logger name (usually the component or module name).
 * @param config - Optional configuration; a `name` in it wins over `name`.
 * @returns The logger instance.
 */
export function useLogger(name: string, config?: Partial<LoggerConfig>): Logger {
  const provider = useLoggerProvider()
  if (config) {
    return provider.createLogger({ name, ...config })
  }
  return provider.getLogger(name)
}

/**
 * The provider's unnamed root logger. Call it in an injection context.
 *
 * @returns The root logger instance.
 */
export function useRootLogger(): Logger {
  const provider = useLoggerProvider()
  return provider.getLogger()
}

/**
 * A child logger whose context rides every call. Call it in an injection
 * context.
 *
 * @param parentName - The parent logger's name.
 * @param context - Additional context included in every log call.
 * @returns The child logger instance.
 */
export function useChildLogger(parentName: string, context: Record<string, unknown>): Logger {
  const provider = useLoggerProvider()
  const parent = provider.getLogger(parentName)
  return parent.withContext(context)
}
