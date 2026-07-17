# @molecule/api-logger-loglevel

Loglevel logger provider for molecule.dev.

Provides a lightweight logger implementation using loglevel.

## Quick Start

```typescript
import { logger, setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-loglevel'

setLogger(provider)
logger.info('Server started on port', 3000)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-logger-loglevel @molecule/api-logger loglevel
```

## API

### Interfaces

#### `Logger`

Logger interface that all implementations must satisfy.

```typescript
interface Logger {
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
```

### Types

#### `LogLevel`

Log levels supported by the logger.

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

### Functions

#### `createLogger(options)`

Creates a named loglevel logger that implements the `Logger` interface.

Without an explicit `level`, the instance is set to pass everything through
(TRACE) — loglevel's own out-of-the-box default is WARN, which silently
swallows info/debug and makes the logger look broken. Level filtering
belongs to `@molecule/api-logger`'s single gate (`LOG_LEVEL` / `setLevel()`,
default `'info'`); pass `level` here only to add a bond-side gate on top.

Note: loglevel caches instances by name, so `createLogger({ name })` with an
already-used name returns (and re-levels) that same shared instance.

```typescript
function createLogger(options?: { level?: LogLevel; name?: string; }): Logger
```

- `options` — Logger configuration.
- `options.level` — The minimum log level. Defaults to pass-through (`'trace'`).
- `options.name` — The logger name (used to create a named loglevel instance).

**Returns:** A `Logger` backed by loglevel.

#### `getLevel()`

Returns the current log level of the default loglevel instance.

```typescript
function getLevel(): LogLevel
```

**Returns:** The current `LogLevel` (e.g. `'info'`, `'debug'`, `'warn'`).

#### `setLevel(level)`

Sets the minimum log level for the default loglevel instance.

```typescript
function setLevel(level: LogLevel): void
```

- `level` — The molecule log level to set.

### Constants

#### `levelMap`

Map molecule log levels to loglevel levels.

```typescript
const levelMap: Record<LogLevel, loglevel.LogLevelNumbers>
```

#### `log`

The underlying loglevel instance.

```typescript
const log: loglevel.Logger
```

#### `loglevel`

The underlying loglevel instance.

```typescript
const loglevel: loglevel.Logger
```

#### `provider`

The loglevel logger provider implementing the standard interface.

```typescript
const provider: Logger
```

## Core Interface
Implements `@molecule/api-logger` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-loglevel'

export function setupLoggerLoglevel(): void {
  setLogger(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/api-logger`
- `loglevel`

- The provider passes every level through to loglevel — minimum-level
  filtering happens once, in `@molecule/api-logger` (`LOG_LEVEL` env var /
  `setLevel()`, default `'info'`). Raw loglevel's own default level is WARN,
  which would otherwise silently swallow `logger.info(...)` out of the box.
- Use this package's `setLevel()`/`createLogger({ level })` only when you
  want an ADDITIONAL bond-side gate below the core's — a stricter level here
  makes the core's `setLevel('debug')` appear to do nothing.
- `trace` delegates to `console.trace`, which prints a stack trace with
  every call (loglevel behavior, not a bug).
