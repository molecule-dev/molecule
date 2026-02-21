# @molecule/api-secrets-env

Environment variables secrets provider for molecule.dev.

Reads secrets from .env files and process.env.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-secrets-env
```

## Usage

```typescript
import { setProvider } from '@molecule/api-secrets'
import { provider } from '@molecule/api-secrets-env'

setProvider(provider)
```

## API

### Interfaces

#### `EnvProviderOptions`

Options for env provider.

```typescript
interface EnvProviderOptions {
  /**
   * Path to the .env file. Ignored when `layers` is provided.
   * @default '.env'
   */
  path?: string

  /**
   * Whether to load the .env file on initialization.
   * @default true
   */
  autoLoad?: boolean

  /**
   * Whether to override existing environment variables.
   * @default false
   */
  override?: boolean

  /**
   * Array of `.env` file paths to load in order. Later files override
   * earlier ones. When provided, `path` is ignored.
   *
   * @example
   * ```typescript
   * createEnvProvider({
   *   layers: ['.env', '.env.staging', '.env.staging.feat-login'],
   * })
   * ```
   */
  layers?: string[]
}
```

### Functions

#### `createEnvProvider(options)`

Creates an environment variables secrets provider that reads from a `.env` file and `process.env`.
Supports get/set/delete with file persistence, and `syncToEnv` to copy `.env` values into `process.env`.

```typescript
function createEnvProvider(options?: EnvProviderOptions): SecretsProvider
```

- `options` — Path to `.env` file (default `'.env'`), auto-load flag, and override behavior.

**Returns:** A `SecretsProvider` backed by `.env` files and `process.env`.

### Constants

#### `provider`

Default env provider instance, reading from `.env` in the current working directory.

```typescript
const provider: SecretsProvider
```

## Core Interface
Implements `@molecule/api-secrets` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
