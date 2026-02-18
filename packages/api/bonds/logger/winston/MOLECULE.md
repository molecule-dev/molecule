# @molecule/api-logger-winston

Winston logger provider for molecule.dev.

Provides a full-featured logger implementation using winston.

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
  level?: LogLevel
  format?: 'json' | 'console'
  transports?: WinstonTransportConfig[]
}
```

#### `WinstonTransportConfig`

Configuration for a winston transport.

```typescript
interface WinstonTransportConfig {
  type: 'console' | 'file' | 'http' | string
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
Supports console, file, and HTTP transports.

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
