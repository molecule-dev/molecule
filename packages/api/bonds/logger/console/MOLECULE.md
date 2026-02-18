# @molecule/api-logger-console

Console logger provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-logger-console
```

## Usage

```typescript
import { setLogger } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-console'

setLogger(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
