# @molecule/app-logger

Frontend logging interface for molecule.dev.

Provides a unified logging API that can be backed by different
implementations (console, loglevel, remote logging, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-logger
```

## API

### Interfaces

#### `LogEntry`

Structured log entry passed to transports, containing the level, message, timestamp, and optional context.

```typescript
interface LogEntry {
  /**
   * Log level.
   */
  level: Exclude<LogLevel, 'silent'>

  /**
   * Log message.
   */
  message: string

  /**
   * Additional arguments.
   */
  args: unknown[]

  /**
   * Timestamp.
   */
  timestamp: Date

  /**
   * Logger name/namespace.
   */
  logger?: string

  /**
   * Additional context.
   */
  context?: Record<string, unknown>
}
```

#### `Logger`

Logger instance with leveled logging methods, child logger creation,
and transport management.

```typescript
interface Logger {
  /**
   * Logs a trace message.
   */
  trace(message: string, ...args: unknown[]): void

  /**
   * Logs a debug message.
   */
  debug(message: string, ...args: unknown[]): void

  /**
   * Logs an info message.
   */
  info(message: string, ...args: unknown[]): void

  /**
   * Logs a warning message.
   */
  warn(message: string, ...args: unknown[]): void

  /**
   * Logs an error message.
   */
  error(message: string | Error, ...args: unknown[]): void

  /**
   * Sets the log level.
   */
  setLevel(level: LogLevel): void

  /**
   * Gets the current log level.
   */
  getLevel(): LogLevel

  /**
   * Creates a child logger with a namespace.
   */
  child(name: string, context?: Record<string, unknown>): Logger

  /**
   * Adds additional context to the logger.
   */
  withContext(context: Record<string, unknown>): Logger

  /**
   * Adds a transport.
   */
  addTransport(transport: LogTransport): () => void

  /**
   * Removes a transport.
   */
  removeTransport(transport: LogTransport): void
}
```

#### `LoggerConfig`

Configuration for creating a logger instance.

```typescript
interface LoggerConfig {
  /**
   * Minimum log level.
   */
  level?: LogLevel

  /**
   * Logger name/namespace.
   */
  name?: string

  /**
   * Additional transports (remote logging, file, etc.).
   */
  transports?: LogTransport[]

  /**
   * Whether to include timestamps in console output.
   */
  timestamps?: boolean

  /**
   * Custom log format function.
   */
  format?: (entry: LogEntry) => string

  /**
   * Default context to include with all logs.
   */
  context?: Record<string, unknown>
}
```

#### `LoggerProvider`

Logger provider interface that all logger bond packages must implement.
Creates and manages logger instances and global log configuration.

```typescript
interface LoggerProvider {
  /**
   * Gets a logger by name, or the root logger if no name given.
   */
  getLogger(name?: string): Logger

  /**
   * Creates a named logger.
   */
  createLogger(nameOrConfig: string | LoggerConfig, config?: LoggerConfig): Logger

  /**
   * Sets the global log level.
   */
  setLevel(level: LogLevel): void

  /**
   * Gets the global log level.
   */
  getLevel(): LogLevel

  /**
   * Adds a global transport.
   */
  addTransport(transport: LogTransport): () => void

  /**
   * Enables logging.
   */
  enable(): void

  /**
   * Disables logging.
   */
  disable(): void

  /**
   * Checks if logging is enabled.
   *
   * @returns `true` if logging is currently enabled.
   */
  isEnabled(): boolean
}
```

### Types

#### `LogLevel`

Available log severity levels, ordered from most verbose (trace) to silent.

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
```

#### `LogTransport`

Log transport function. Receives each log entry for custom
processing (e.g. remote logging, file output, error tracking).

```typescript
type LogTransport = (entry: LogEntry) => void
```

### Functions

#### `createConsoleLogger(config)`

Creates a console-based logger that outputs to `console.*` methods
and dispatches entries to registered transports.

```typescript
function createConsoleLogger(config?: LoggerConfig): Logger
```

- `config` — Logger configuration (level, name, transports, format).

**Returns:** A `Logger` instance backed by the browser/Node console.

#### `createConsoleLoggerProvider(defaultLevel)`

Creates a console-based logger provider with configurable log level,
named child loggers, and pluggable transports.

```typescript
function createConsoleLoggerProvider(defaultLevel?: LogLevel): LoggerProvider
```

- `defaultLevel` — The initial global log level (defaults to `'info'`).

**Returns:** A `LoggerProvider` backed by console output.

#### `createLogger(nameOrConfig, config)`

Creates a named logger with optional configuration via the bonded provider.

```typescript
function createLogger(nameOrConfig: string | LoggerConfig, config?: LoggerConfig): Logger
```

- `nameOrConfig` — The logger name string, or a full `LoggerConfig` object.
- `config` — Optional configuration when the first argument is a name string.

**Returns:** A new named logger instance.

#### `createRemoteTransport(options, options, options, options, options, options)`

Creates a remote logging transport that batches log entries and
sends them to a remote endpoint via HTTP POST.

```typescript
function createRemoteTransport(options: { url: string; minLevel?: LogLevel; batchSize?: number; flushInterval?: number; headers?: Record<string, string>; }): LogTransport
```

- `options` — Transport configuration.
- `options` — .url - The remote endpoint URL to POST log batches to.
- `options` — .minLevel - Minimum log level to send (default: `'warn'`).
- `options` — .batchSize - Number of entries to buffer before flushing (default: 10).
- `options` — .flushInterval - Milliseconds between automatic flushes (default: 5000).
- `options` — .headers - Additional HTTP headers for the POST request.

**Returns:** A `LogTransport` function that buffers and sends entries.

#### `debug(message, args)`

Logs a debug-level message via the root logger.

```typescript
function debug(message: string, args?: unknown[]): void
```

- `message` — The log message string.
- `args` — Additional arguments to include in the log entry.

**Returns:** Nothing.

#### `defaultFormat(entry)`

Default log format: `"ISO_TIMESTAMP LEVEL[name]: message"`.

```typescript
function defaultFormat(entry: LogEntry): string
```

- `entry` — The log entry to format.

**Returns:** The formatted log string.

#### `error(message, args)`

Logs an error-level message via the root logger.

```typescript
function error(message: string | Error, args?: unknown[]): void
```

- `message` — The error message string or Error object.
- `args` — Additional arguments to include in the log entry.

**Returns:** Nothing.

#### `getLevel()`

Returns the current global log level from the bonded provider.

```typescript
function getLevel(): LogLevel
```

**Returns:** The active log level.

#### `getLogger(name)`

Retrieves a logger by name from the bonded provider. Returns the root
logger if no name is given.

```typescript
function getLogger(name?: string): Logger
```

- `name` — Optional logger name for scoped logging.

**Returns:** The named or root logger.

#### `getProvider()`

Retrieves the bonded logger provider. If none is bonded, automatically
creates and bonds a console-based provider with log level auto-detected
from `NODE_ENV` (`'debug'` in development, `'info'` otherwise).

```typescript
function getProvider(): LoggerProvider
```

**Returns:** The active logger provider.

#### `info(message, args)`

Logs an info-level message via the root logger.

```typescript
function info(message: string, args?: unknown[]): void
```

- `message` — The log message string.
- `args` — Additional arguments to include in the log entry.

**Returns:** Nothing.

#### `setLevel(level)`

Sets the global log level on the bonded provider, affecting all loggers.

```typescript
function setLevel(level: LogLevel): void
```

- `level` — The log level to set (`'trace'`, `'debug'`, `'info'`, `'warn'`, `'error'`, or `'silent'`).

**Returns:** Nothing.

#### `setProvider(provider)`

Registers a logger provider as the active singleton.

```typescript
function setProvider(provider: LoggerProvider): void
```

- `provider` — The logger provider implementation to bond.

#### `trace(message, args)`

Logs a trace-level message via the root logger.

```typescript
function trace(message: string, args?: unknown[]): void
```

- `message` — The log message string.
- `args` — Additional arguments to include in the log entry.

**Returns:** Nothing.

#### `warn(message, args)`

Logs a warn-level message via the root logger.

```typescript
function warn(message: string, args?: unknown[]): void
```

- `message` — The log message string.
- `args` — Additional arguments to include in the log entry.

**Returns:** Nothing.

### Constants

#### `LOG_LEVEL_PRIORITY`

Log level priority (lower = more verbose).

```typescript
const LOG_LEVEL_PRIORITY: Record<LogLevel, number>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
