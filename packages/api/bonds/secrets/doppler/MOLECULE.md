# @molecule/api-secrets-doppler

Doppler secrets provider for molecule.dev.

Retrieves secrets from Doppler using their API.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-secrets-doppler
```

## Usage

```typescript
import { setProvider } from '@molecule/api-secrets'
import { provider } from '@molecule/api-secrets-doppler'

setProvider(provider)
```

## API

### Interfaces

#### `DopplerProviderOptions`

Options for doppler provider.

```typescript
interface DopplerProviderOptions {
  /**
   * Doppler service token.
   * If not provided, reads from DOPPLER_TOKEN env var.
   */
  token?: string

  /**
   * Doppler project name.
   * Required if using a personal token instead of service token.
   */
  project?: string

  /**
   * Doppler config/environment name.
   * Required if using a personal token instead of service token.
   */
  config?: string

  /**
   * Cache TTL in milliseconds.
   * @default 60000 (1 minute)
   */
  cacheTtl?: number
}
```

### Functions

#### `createDopplerProvider(options)`

Creates a Doppler secrets provider that fetches secrets from the Doppler API.
Caches secrets for the configured TTL. Falls back to `process.env` on API failure.

```typescript
function createDopplerProvider(options?: DopplerProviderOptions): SecretsProvider
```

- `options` — Doppler connection options (token, project, config, cache TTL). Falls back to `DOPPLER_TOKEN` env var.

**Returns:** A `SecretsProvider` with get/set/delete/syncToEnv backed by Doppler.

### Constants

#### `provider`

Default Doppler provider instance, created with options from environment variables.

```typescript
const provider: SecretsProvider
```

## Core Interface
Implements `@molecule/api-secrets` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `DOPPLER_TOKEN` *(required)*

## Translations

Translation strings are provided by `@molecule/api-locales-secrets-doppler`.
