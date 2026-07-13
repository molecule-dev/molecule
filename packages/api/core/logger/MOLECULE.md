# @molecule/api-logger

Logger core interface for molecule.dev.

Provides an abstract logging interface with a built-in console logger.
Use `setLogger` to swap in a provider like pino, winston, or loglevel.

## Quick Start

```typescript
import { logger, setLevel, setLogger, resetLogger } from '@molecule/api-logger'

// Use the default console logger
logger.info('Server started on port', 3000)
logger.warn('Rate limit approaching')
logger.error('Database connection failed', error)

// The minimum level defaults to 'info' — trace/debug are DROPPED until
// you lower the gate (or set LOG_LEVEL=debug in the environment):
setLevel('debug')
logger.debug('Request received', { method: 'GET', path: '/api' })

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

Returns the current minimum log level, resolving it from the `LOG_LEVEL`
environment variable on first call if `setLevel()` has not been used yet.

```typescript
function getLevel(): LogLevel
```

**Returns:** The active `LogLevel`.

#### `hasLogger()`

Checks whether a custom logger provider is active — either bonded via
`setLogger()` directly, or wired through `bond('logger', provider)` (the
path every bond package's `getLogger()` and this module's own
`getCurrentLogger()` honor). Reflects the actual bond registry rather than
a flag private to `setLogger()`, so it stays accurate regardless of which
wiring path bonded the provider.

```typescript
function hasLogger(): boolean
```

**Returns:** `true` if a custom (non-console) logger provider is bonded.

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

- **`logger.debug(...)`/`logger.trace(...)` print nothing by default.** The
  minimum level is `'info'` (from the `LOG_LEVEL` env var, falling back to
  `'info'` when unset/invalid). A "missing" debug line means the gate is
  filtering it — call `setLevel('debug')` or set `LOG_LEVEL=debug`; the
  logger is not broken.
- **`LOG_LEVEL` is read lazily, on the first call that needs the level**
  (`logger.*`/`getLevel()`), not at module-import time — and the result is
  then cached until `setLevel()` overrides it. This means an app that loads
  `dotenv`/`.env` AFTER its first transitive import of this module still
  sees `LOG_LEVEL`, as long as env loading finishes before the first log
  call (true in virtually every app — real logging starts after startup
  config, not during module evaluation).
- Filtering happens ONCE, here in the core, before the bonded provider is
  invoked. Provider bonds (pino/winston/loglevel) deliberately pass every
  level through, so this gate is the single knob — don't also configure a
  level in the bond unless you want a second, stricter gate.
- `setLevel('silent')` drops everything, including `logger.error(...)`.
- **`hasLogger()` reflects the bond registry**, not just `setLogger()`
  calls: it also returns `true` after `bond('logger', provider)` wired a
  provider directly (the path every bond package's `getLogger()` uses).
