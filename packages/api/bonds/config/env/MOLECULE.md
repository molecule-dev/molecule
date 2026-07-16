# @molecule/api-config-env

Environment configuration provider for molecule.dev.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-config'
import { provider } from '@molecule/api-config-env'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-config-env @molecule/api-config @molecule/api-i18n
```

## API

### Constants

#### `envProvider`

Environment-based configuration provider.

```typescript
const envProvider: ConfigProvider
```

#### `provider`

Default environment configuration provider.

```typescript
const provider: ConfigProvider
```

## Core Interface
Implements `@molecule/api-config` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-config'
import { provider } from '@molecule/api-config-env'

export function setupConfigEnv(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-config` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-config`
- `@molecule/api-i18n`

- **Values are always strings at runtime.** `get<T>()` casts, it does not
  coerce: `get<number>('PORT')` returns the string `'3000'`. Use the core's
  `getNumber()` / `getBoolean()` / `getString()` helpers from
  `@molecule/api-config` for typed reads, or convert explicitly.
- `set()` writes back to `process.env` (stringified) — visible to the whole
  process, not persisted anywhere.
