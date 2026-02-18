# @molecule/api-config-env

Environment configuration provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-config-env
```

## Usage

```typescript
import { setProvider } from '@molecule/api-config'
import { provider } from '@molecule/api-config-env'

setProvider(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-config` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
