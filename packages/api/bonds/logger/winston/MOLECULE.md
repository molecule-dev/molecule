# @molecule/api-logger-winston

Winston logger provider for molecule.dev.

Provides a full-featured logger implementation using winston.

## Quick Start

```typescript
import { logger, setLogger } from '@molecule/api-logger'
import { createLogger, provider } from '@molecule/api-logger-winston'

// Default: colorized console output
setLogger(provider)
logger.info('Server started on port', 3000)
logger.error('Database connection failed', error) // message + full stack

// Custom instance: JSON to a file
setLogger(
  createLogger({
    format: 'json',
    transports: [{ type: 'file', options: { filename: 'app.log' } }],
  }),
)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-logger-winston
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

#### `WinstonLoggerOptions`

Options for creating a winston logger.

```typescript
interface WinstonLoggerOptions {
  /**
   * Minimum level for the winston instance. Defaults to `'info'` — a
   * bond-side gate that drops the core's `debug`/`trace` even after
   * `setLevel('debug')` in `@molecule/api-logger`. Pass `'trace'` when the
   * core's gate should be the only filter (what the default `provider` does).
   */
  level?: LogLevel
  /** Output format. Defaults to `'json'` (timestamps + error stacks); `'console'` is colorized. */
  format?: 'json' | 'console'
  /** Transports to attach. Defaults to a single console transport. */
  transports?: WinstonTransportConfig[]
}
```

#### `WinstonTransportConfig`

Configuration for a winston transport.

`stream` expects a writable stream in `options.stream` — useful for tests
and in-process sinks. Unknown types fall back to a console transport.

```typescript
interface WinstonTransportConfig {
  type: 'console' | 'file' | 'http' | 'stream' | string
  level?: LogLevel
  options?: Record<string, unknown>
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

Creates a winston-based logger that implements the `Logger` interface.
Supports console, file, HTTP, and stream transports.

```typescript
function createLogger(options?: WinstonLoggerOptions): Logger
```

- `options` — Winston configuration (log level, format, transports).

**Returns:** A `Logger` backed by winston.

### Constants

#### `format`

Winston format utilities for convenience.

```typescript
const format: typeof winston.format
```

#### `provider`

The default winston logger with console format.

Level filtering is delegated to `@molecule/api-logger`'s gate (`LOG_LEVEL` /
`setLevel()`, default `'info'`) — the underlying instance passes everything
through so the core's single gate governs; a second gate here would make the
core's `setLevel('debug')` silently no-op.

```typescript
const provider: Logger
```

#### `transports`

Winston transports for convenience.

```typescript
const transports: winston.transports.Transports
```

### Namespaces

#### `winston`

## Core Interface
Implements `@molecule/api-logger` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setLevel, setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-winston'

export function setupLoggerWinston(): void {
  setLevel(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0

- Console-style variadic calls are bridged onto winston's
  `(message, meta)` shape: `logger.info('msg', contextObj)` merges
  `contextObj` into the record, and an `Error` (alone or after a message)
  keeps its stack. Naively stringifying args would print `[object Object]`
  and drop stacks.
- The default `provider` instance passes every level through — minimum-level
  filtering happens once, in `@molecule/api-logger` (`LOG_LEVEL` /
  `setLevel()`, default `'info'`). `createLogger({ level })` adds a
  bond-side gate below the core's; a stricter level there makes the core's
  `setLevel('debug')` appear to do nothing. NOTE: omitting `level` in
  `createLogger` defaults the instance to `'info'` — itself such a gate;
  pass `level: 'trace'` when the core's gate should be the only filter.
- Transport types: `console`, `file`, `http`, and `stream`
  (`options.stream` = any writable — handy for tests and in-process sinks).
