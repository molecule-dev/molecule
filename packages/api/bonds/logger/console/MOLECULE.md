# @molecule/api-logger-console

Console logger provider for molecule.dev.

## Quick Start

```typescript
import { setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-console'

setLogger(provider)
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
