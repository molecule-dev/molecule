# @molecule/api-logger-pino

Pino logger provider for molecule.dev.

Provides a high-performance logger implementation using pino.

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
  level?: LogLevel
  pretty?: boolean
  name?: string
  transport?:
    | { target: string; options?: Record<string, unknown> }
    | { targets: PinoTransportTarget[] }
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

```typescript
function createChildLogger(bindings: Record<string, unknown>): Logger
```

- `bindings` — Key-value pairs to include in every log entry from this child.

**Returns:** A `Logger` that inherits the parent's configuration with added context.

#### `createLogger(options)`

Creates a pino-based logger that implements the `Logger` interface.
Supports pretty-printing and custom transports.

```typescript
function createLogger(options?: PinoLoggerOptions): Logger
```

- `options` — Pino configuration (log level, name, pretty mode, transport).

**Returns:** A `Logger` backed by pino.

#### `pino()`

```typescript
function pino(optionsOrStream?: pino.LoggerOptions<CustomLevels, UseOnlyCustomLevels> | pino.DestinationStream): pino.Logger<CustomLevels, UseOnlyCustomLevels>
```

**Returns:** a new logger instance.

### Constants

#### `provider`

The default pino logger, with pretty-printing enabled outside production.

```typescript
const provider: Logger
```

## Core Interface
Implements `@molecule/api-logger` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
