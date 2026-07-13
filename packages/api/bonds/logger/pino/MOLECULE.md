# @molecule/api-logger-pino

Pino logger provider for molecule.dev.

Provides a high-performance logger implementation using pino.

## Quick Start

```typescript
import { logger, setLogger } from '@molecule/api-logger'
import { createLogger, provider } from '@molecule/api-logger-pino'

// Default: pretty in development, JSON in production
setLogger(provider)
logger.info('Server started on port', 3000)
logger.error('Database connection failed', error) // Error lands under `err` with its stack

// Custom instance (name, transport, or an in-process destination) — level
// omitted, so this instance defers to the core's LOG_LEVEL/setLevel() gate
setLogger(createLogger({ name: 'api' }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-logger-pino
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

#### `PinoLoggerOptions`

Options for creating a pino logger.

```typescript
interface PinoLoggerOptions {
  /**
   * Minimum log level for the underlying pino instance. Defaults to
   * `'trace'` (pass-through) — minimum-level filtering is meant to happen
   * once, in `@molecule/api-logger`'s gate (`LOG_LEVEL` / `setLevel()`).
   * Pass an explicit `level` only to add a second, stricter gate on this
   * instance specifically.
   */
  level?: LogLevel
  /** Pretty-print via the pino-pretty transport (ignored when `destination` is set). */
  pretty?: boolean
  /** Instance name included in every record. */
  name?: string
  /** Worker-thread transport configuration (ignored when `destination` is set). */
  transport?:
    | { target: string; options?: Record<string, unknown> }
    | { targets: PinoTransportTarget[] }
  /**
   * In-process destination stream (anything with a `write(msg: string)` —
   * e.g. `pino.destination(...)`, a file stream, or a test sink). Takes
   * precedence over `pretty`/`transport`, since pino cannot combine a
   * transport with a stream.
   */
  destination?: pino.DestinationStream
}
```

#### `PinoTransportTarget`

Single transport target configuration.

```typescript
interface PinoTransportTarget {
  target: string
  level?: string
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

#### `createChildLogger(bindings)`

Creates a child pino logger with additional context bindings
(e.g. `{ requestId: '...', userId: '...' }`).

The child derives from the same shared instance that backs `provider`, so
it truly inherits the default configuration (pretty mode, level).

```typescript
function createChildLogger(bindings: Record<string, unknown>): Logger
```

- `bindings` — Key-value pairs to include in every log entry from this child.

**Returns:** A `Logger` that inherits the default configuration with added context.

#### `createLogger(options)`

Creates a pino-based logger that implements the `Logger` interface.
Supports pretty-printing, custom transports, and a custom destination
stream (useful for tests and in-process sinks).

```typescript
function createLogger(options?: PinoLoggerOptions): Logger
```

- `options` — Pino configuration (log level, name, pretty mode, transport, destination).

**Returns:** A `Logger` backed by pino.

#### `pino()`

```typescript
function pino(optionsOrStream?: pino.LoggerOptions<CustomLevels, UseOnlyCustomLevels> | pino.DestinationStream): pino.Logger<CustomLevels, UseOnlyCustomLevels>
```

**Returns:** a new logger instance.

### Constants

#### `provider`

The default pino logger, with pretty-printing enabled outside production.
Level filtering is delegated to `@molecule/api-logger`'s gate — the
underlying instance emits everything it is handed.

```typescript
const provider: Logger
```

## Core Interface
Implements `@molecule/api-logger` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setLevel, setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-pino'

export function setupLoggerPino(): void {
  setLevel(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0

- Console-style variadic calls are bridged onto pino's `(object, message)`
  shape: `logger.info('msg', contextObj)` merges `contextObj` into the
  record, an `Error` anywhere serializes under `err` with its stack, and
  extra primitives are formatted into the message. Raw pino would DROP
  placeholder-less extra args and turn them into `{"0":…}` records.
- Both the default `provider` AND `createLogger()` (level omitted) pass
  every level through to pino — minimum-level filtering happens once, in
  `@molecule/api-logger` (`LOG_LEVEL` / `setLevel()`, default `'info'`).
  Passing an explicit `level` to `createLogger()` adds a SECOND, bond-side
  gate below the core's; a stricter level there makes the core's
  `setLevel('debug')` appear to do nothing — only do this if you actually
  want a second, independent filter on this specific instance.
- The default instance is created lazily on first log call (importing the
  package never spawns the pino-pretty worker thread).
