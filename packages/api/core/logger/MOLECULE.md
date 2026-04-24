# @molecule/api-logger

Logger core interface for molecule.dev.

Provides an abstract logging interface with a built-in console logger.
Use `setLogger` to swap in a provider like pino, winston, or loglevel.

## Quick Start

```typescript
import { logger, setLogger, resetLogger } from '@molecule/api-logger'

// Use the default console logger
logger.info('Server started on port', 3000)
logger.debug('Request received', { method: 'GET', path: '/api' })
logger.warn('Rate limit approaching')
logger.error('Database connection failed', error)

// Set a custom logger provider
import { log } from '@molecule/api-logger-loglevel'
setLogger(log)

// Reset to default console logger
resetLogger()
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-logger
```

## API

### Interfaces

#### `Logger`

Logger interface that all implementations must satisfy.

```typescript
interface Logger {
  trace(...args: unknown[]): void
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}
```

### Types

#### `LogLevel`

Log levels supported by the logger.

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
```

### Functions

#### `getLevel()`

Returns the current minimum log level.

```typescript
function getLevel(): LogLevel
```

**Returns:** The active `LogLevel`.

#### `hasLogger()`

Checks whether a custom logger has been bonded via `setLogger()`.

```typescript
function hasLogger(): boolean
```

**Returns:** `true` if a custom logger provider has been set.

#### `resetLogger()`

Resets the logger back to the built-in console logger.

```typescript
function resetLogger(): void
```

#### `setLevel(level)`

Sets the minimum log level. Messages below this level are silently dropped.

```typescript
function setLevel(level: LogLevel): void
```

- `level` — The minimum log level to allow.

#### `setLogger(newLogger)`

Registers a logger implementation as the active provider.

```typescript
function setLogger(newLogger: Logger): void
```

- `newLogger` — The logger implementation to bond.

### Constants

#### `logger`

Singleton logger proxy. Each method delegates to the currently bonded
logger at call time, so swapping providers via `setLogger()` takes
effect immediately without re-importing.

Messages below the active minimum level (set via `LOG_LEVEL` env var
or `setLevel()`) are silently dropped.

```typescript
const logger: Logger
```

## Available Providers

| Provider | Package |
|----------|---------|
| Console | `@molecule/api-logger-console` |
| Loglevel | `@molecule/api-logger-loglevel` |
| Pino | `@molecule/api-logger-pino` |
| Winston | `@molecule/api-logger-winston` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
