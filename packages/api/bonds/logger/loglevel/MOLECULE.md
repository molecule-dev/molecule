# @molecule/api-logger-loglevel

Loglevel logger provider for molecule.dev.

Provides a lightweight logger implementation using loglevel.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-logger-loglevel
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

#### `createLogger(options, options, options)`

Creates a named loglevel logger that implements the `Logger` interface.

```typescript
function createLogger(options?: { level?: LogLevel; name?: string; }): Logger
```

- `options` — Logger configuration.
- `options` — .level - The minimum log level.
- `options` — .name - The logger name (used to create a named loglevel instance).

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
