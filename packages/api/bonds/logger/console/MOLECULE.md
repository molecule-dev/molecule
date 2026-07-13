# @molecule/api-logger-console

Console logger provider for molecule.dev.

## Quick Start

```typescript
import { logger, setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-console'

setLogger(provider)
logger.info('Server started on port', 3000)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-logger-console
```

## API

### Constants

#### `consoleLogger`

Console-based logger implementation.

```typescript
const consoleLogger: Logger
```

#### `provider`

Default console logger provider.

```typescript
const provider: Logger
```

## Core Interface
Implements `@molecule/api-logger` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setLevel, setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-console'

export function setupLoggerConsole(): void {
  setLevel(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0

- The provider passes every level straight to the matching `console`
  method — minimum-level filtering happens once, in `@molecule/api-logger`
  (`LOG_LEVEL` env var / `setLevel()`, default `'info'`). A "missing"
  `logger.debug(...)` line means the CORE's gate dropped it — lower the
  gate; the provider has no level configuration of its own.
- `trace` delegates to `console.trace`, which prints a stack trace with
  every call (console behavior, not a bug).
