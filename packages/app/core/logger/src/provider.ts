/**
 * App-side logger bond accessor, console logger factory, and convenience functions.
 *
 * Provides a built-in console-based logger provider that is auto-created on
 * first access if no custom provider is bonded. The default log level is
 * `'debug'` in development and `'info'` in production.
 *
 * @module
 */

import { createConsoleLogger } from './console-logger.js'
import { redactCredentials, snapshotCredentials } from './redaction.js'
import type {
  LogEntry,
  Logger,
  LoggerConfig,
  LoggerProvider,
  LogLevel,
  LogTransport,
} from './types.js'

const consoleProviders = new WeakSet<LoggerProvider>()

/**
 * Creates a console-based logger provider with configurable log level,
 * named child loggers, and pluggable transports.
 *
 * @param defaultLevel - The initial global log level (defaults to `'info'`).
 * @returns A `LoggerProvider` backed by console output.
 */
export const createConsoleLoggerProvider = (defaultLevel: LogLevel = 'info'): LoggerProvider => {
  let globalLevel = defaultLevel
  let enabled = true
  const globalTransports = new Set<LogTransport>()
  const loggers = new Map<string, ReturnType<typeof createConsoleLogger>>()

  const rootLogger = createConsoleLogger({ level: globalLevel })

  const consoleProvider: LoggerProvider = {
    getLogger: (name?: string) => {
      if (!name) return rootLogger
      if (loggers.has(name)) return loggers.get(name)!
      return rootLogger
    },

    createLogger: (nameOrConfig: string | LoggerConfig, config?: LoggerConfig) => {
      const resolvedName =
        typeof nameOrConfig === 'string' ? nameOrConfig : nameOrConfig.name || 'default'
      const resolvedConfig = typeof nameOrConfig === 'string' ? config : nameOrConfig

      if (loggers.has(resolvedName)) {
        return loggers.get(resolvedName)!
      }

      const logger = createConsoleLogger({
        ...resolvedConfig,
        name: resolvedName,
        level: resolvedConfig?.level || globalLevel,
        transports: [...Array.from(globalTransports), ...(resolvedConfig?.transports || [])],
      })

      loggers.set(resolvedName, logger)
      return logger
    },

    setLevel: (level: LogLevel) => {
      globalLevel = level
      rootLogger.setLevel(level)
      loggers.forEach((logger) => logger.setLevel(level))
    },

    getLevel: () => globalLevel,

    addTransport: (transport: LogTransport) => {
      globalTransports.add(transport)
      rootLogger.addTransport(transport)
      loggers.forEach((logger) => logger.addTransport(transport))
      return () => {
        globalTransports.delete(transport)
        rootLogger.removeTransport(transport)
        loggers.forEach((logger) => logger.removeTransport(transport))
      }
    },

    enable: () => {
      enabled = true
      rootLogger.setLevel(globalLevel)
      loggers.forEach((logger) => logger.setLevel(globalLevel))
    },

    disable: () => {
      enabled = false
      rootLogger.setLevel('silent')
      loggers.forEach((logger) => logger.setLevel('silent'))
    },

    isEnabled: () => enabled,
  }
  consoleProviders.add(consoleProvider)
  return consoleProvider
}

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

const BOND_TYPE = 'app-logger'

const providerWrappers = new WeakMap<LoggerProvider, LoggerProvider>()
const wrappedProviders = new WeakSet<LoggerProvider>()
const loggerWrappers = new WeakMap<Logger, Logger>()
const transportWrappers = new WeakMap<LogTransport, LogTransport>()

/** Scrub an entry immediately before ANY custom transport can retain or emit it. */
const credentialSafeTransport = (transport: LogTransport): LogTransport => {
  const cached = transportWrappers.get(transport)
  if (cached) return cached
  const wrapped: LogTransport = (entry) => transport(snapshotCredentials(entry))
  transportWrappers.set(transport, wrapped)
  return wrapped
}

/** Keep formatter/transport callbacks behind the same entry boundary as logger arguments. */
const credentialSafeConfig = (config: LoggerConfig): LoggerConfig => {
  const scrubbed = redactCredentials(config)
  return {
    ...scrubbed,
    ...(config.format
      ? { format: (entry: LogEntry) => config.format!(snapshotCredentials(entry)) }
      : {}),
    ...(config.transports ? { transports: config.transports.map(credentialSafeTransport) } : {}),
  }
}

/** Wrap custom logger implementations too; identity caching preserves child/logger reuse. */
const credentialSafeLogger = (logger: Logger): Logger => {
  const cached = loggerWrappers.get(logger)
  if (cached) return cached
  const wrapped: Logger = {
    trace: (message, ...args) =>
      logger.trace(snapshotCredentials(message), ...snapshotCredentials(args)),
    debug: (message, ...args) =>
      logger.debug(snapshotCredentials(message), ...snapshotCredentials(args)),
    info: (message, ...args) =>
      logger.info(snapshotCredentials(message), ...snapshotCredentials(args)),
    warn: (message, ...args) =>
      logger.warn(snapshotCredentials(message), ...snapshotCredentials(args)),
    error: (message, ...args) =>
      logger.error(snapshotCredentials(message), ...snapshotCredentials(args)),
    setLevel: (level) => logger.setLevel(level),
    getLevel: () => logger.getLevel(),
    child: (name, context) =>
      credentialSafeLogger(logger.child(redactCredentials(name), redactCredentials(context))),
    withContext: (context) => credentialSafeLogger(logger.withContext(redactCredentials(context))),
    addTransport: (transport) => logger.addTransport(credentialSafeTransport(transport)),
    removeTransport: (transport) => logger.removeTransport(credentialSafeTransport(transport)),
  }
  loggerWrappers.set(logger, wrapped)
  return wrapped
}

/** Wrap whatever is bonded, including a direct bond that bypassed setProvider(). */
const credentialSafeProvider = (provider: LoggerProvider): LoggerProvider => {
  if (consoleProviders.has(provider) || wrappedProviders.has(provider)) return provider
  const cached = providerWrappers.get(provider)
  if (cached) return cached
  const wrapped: LoggerProvider = {
    getLogger: (name) => credentialSafeLogger(provider.getLogger(redactCredentials(name))),
    createLogger: (nameOrConfig, config) => {
      const logger =
        typeof nameOrConfig === 'string'
          ? provider.createLogger(
              redactCredentials(nameOrConfig),
              config ? credentialSafeConfig(config) : undefined,
            )
          : provider.createLogger(credentialSafeConfig(nameOrConfig))
      return credentialSafeLogger(logger)
    },
    setLevel: (level) => provider.setLevel(level),
    getLevel: () => provider.getLevel(),
    addTransport: (transport) => provider.addTransport(credentialSafeTransport(transport)),
    enable: () => provider.enable(),
    disable: () => provider.disable(),
    isEnabled: () => provider.isEnabled(),
  }
  providerWrappers.set(provider, wrapped)
  wrappedProviders.add(wrapped)
  return wrapped
}

/**
 * Registers a logger provider as the active singleton.
 *
 * @param provider - The logger provider implementation to bond.
 */
export const setProvider = (provider: LoggerProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded logger provider. If none is bonded, automatically
 * creates and bonds a console-based provider with log level auto-detected
 * from `NODE_ENV` (`'debug'` in development, `'info'` otherwise).
 *
 * @returns The active logger provider.
 */
export const getProvider = (): LoggerProvider => {
  if (!isBonded(BOND_TYPE)) {
    // Auto-detect log level from environment only (no storage access)
    let defaultLevel: LogLevel = 'info'

    // Check for debug mode via environment
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      defaultLevel = 'debug'
    }

    bond(BOND_TYPE, createConsoleLoggerProvider(defaultLevel))
  }
  return credentialSafeProvider(bondGet<LoggerProvider>(BOND_TYPE)!)
}

/**
 * Returns `make(source)` for the current source, making it again only when the
 * source changes (a provider or logger bonded since the last call).
 *
 * @param make - Builds the value for one source.
 * @returns A function from the current source to its value.
 */
const perSource = <S, T>(make: (source: S) => T): ((source: S) => T) => {
  let last: { source: S; value: T } | undefined
  return (source) => {
    if (!last || last.source !== source) last = { source, value: make(source) }
    return last.value
  }
}

/**
 * A logger that looks up its target on every call. A module-level
 * `const logger = getLogger('x')` runs at import time, before an app's
 * composition root bonds its provider; resolving per call makes such a logger
 * log through whichever provider is bonded when it logs, so a provider can be
 * swapped at any time.
 *
 * @param resolve - Returns the logger to call now.
 * @returns The forwarding logger.
 */
const forwardingLogger = (resolve: () => Logger): Logger => ({
  trace: (message, ...args) => resolve().trace(message, ...args),
  debug: (message, ...args) => resolve().debug(message, ...args),
  info: (message, ...args) => resolve().info(message, ...args),
  warn: (message, ...args) => resolve().warn(message, ...args),
  error: (message, ...args) => resolve().error(message, ...args),
  setLevel: (level) => resolve().setLevel(level),
  getLevel: () => resolve().getLevel(),
  child: (name, context) => derivedLogger(resolve, (parent) => parent.child(name, context)),
  withContext: (context) => derivedLogger(resolve, (parent) => parent.withContext(context)),
  addTransport: (transport) => resolve().addTransport(transport),
  removeTransport: (transport) => resolve().removeTransport(transport),
})

/**
 * A logger derived from a forwarding logger's current target (`child`,
 * `withContext`). It is derived at once, so a provider whose `withContext` adds
 * the context to the logger in place (the console provider does) applies it
 * immediately, and derived again from each provider bonded after that.
 *
 * @param resolve - Returns the parent's current target.
 * @param make - Derives the logger from a parent.
 * @returns The forwarding derived logger.
 */
const derivedLogger = (resolve: () => Logger, make: (parent: Logger) => Logger): Logger => {
  const from = perSource(make)
  from(resolve())
  return forwardingLogger(() => from(resolve()))
}

const namedLoggers = new Map<string, Logger>()

/**
 * Retrieves a logger by name from the bonded provider. Returns the root
 * logger if no name is given.
 *
 * The logger looks up the bonded provider each time it logs, so one created at
 * module level (before the app bonds its provider) still logs through the
 * provider bonded later, and through a provider swapped in at any time.
 *
 * @param name - Optional logger name for scoped logging.
 * @returns The named or root logger.
 */
export const getLogger = (name?: string): Logger => {
  const key = name ?? ''
  let logger = namedLoggers.get(key)
  if (!logger) {
    logger = forwardingLogger(() => getProvider().getLogger(name))
    namedLoggers.set(key, logger)
  }
  return logger
}

/**
 * Creates a named logger with optional configuration via the bonded provider.
 *
 * Like {@link getLogger}, the logger follows the bonded provider: it is created
 * on the provider bonded when it first logs, and again on each provider bonded
 * after that.
 *
 * @param nameOrConfig - The logger name string, or a full `LoggerConfig` object.
 * @param config - Optional configuration when the first argument is a name string.
 * @returns A new named logger instance.
 */
export const createLogger = (
  nameOrConfig: string | LoggerConfig,
  config?: LoggerConfig,
): Logger => {
  const createdOn = perSource((provider: LoggerProvider) =>
    provider.createLogger(nameOrConfig, config),
  )
  return forwardingLogger(() => createdOn(getProvider()))
}

/**
 * Sets the global log level on the bonded provider, affecting all loggers.
 *
 * @param level - The log level to set (`'trace'`, `'debug'`, `'info'`, `'warn'`, `'error'`, or `'silent'`).
 * @returns Nothing.
 */
export const setLevel = (level: LogLevel): void => getProvider().setLevel(level)

/**
 * Returns the current global log level from the bonded provider.
 *
 * @returns The active log level.
 */
export const getLevel = (): LogLevel => getProvider().getLevel()

/**
 * Logs a trace-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const trace = (message: string, ...args: unknown[]): void =>
  getLogger().trace(message, ...args)

/**
 * Logs a debug-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const debug = (message: string, ...args: unknown[]): void =>
  getLogger().debug(message, ...args)

/**
 * Logs an info-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const info = (message: string, ...args: unknown[]): void =>
  getLogger().info(message, ...args)

/**
 * Logs a warn-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const warn = (message: string, ...args: unknown[]): void =>
  getLogger().warn(message, ...args)

/**
 * Logs an error-level message via the root logger.
 * @param message - The error message string or Error object.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const error = (message: string | Error, ...args: unknown[]): void =>
  getLogger().error(message, ...args)
