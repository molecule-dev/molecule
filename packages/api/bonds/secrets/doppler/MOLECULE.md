# @molecule/api-secrets-doppler

Doppler secrets provider for molecule.dev.

Retrieves secrets from Doppler using their API, caching the full secret set
for a TTL (default 60 s; writes invalidate the cache).

## Quick Start

```typescript
import { setProvider } from '@molecule/api-secrets'
import { provider } from '@molecule/api-secrets-doppler'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-secrets-doppler @molecule/api-bond @molecule/api-i18n @molecule/api-secrets
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

#### `secretsDopplerSecretDefinitions`

Secret definitions required by the Doppler secrets bond.

```typescript
const secretsDopplerSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-secrets` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-secrets'
import { provider } from '@molecule/api-secrets-doppler'

export function setupSecretsDoppler(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `DOPPLER_TOKEN` *(required)* — Doppler service token
  - Setup: Create a service token for your project config (Project → Access → Service Tokens).
  - Get it here: [https://dashboard.doppler.com/](https://dashboard.doppler.com/)
  - Example: `dp.st....`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-secrets`

- **`DOPPLER_TOKEN` must be in the environment BEFORE this module is imported** —
  the default `provider` is created at import time and captures the token then. If
  the token arrives later (e.g. loaded from a `.env` file afterwards), wire
  `createDopplerProvider({ token })` yourself instead of using `provider`.
- **Falls back to `process.env` on ANY Doppler failure** (missing/invalid token,
  network, non-2xx) with only a logged warning — reads keep resolving from the
  environment, so a broken Doppler config degrades SILENTLY. Call
  `provider.isAvailable()` at boot to verify Doppler is actually being used.
- A SERVICE token scopes itself; a PERSONAL token additionally requires the
  `project` and `config` options on `createDopplerProvider()`.
- **`delete()` sets the secret to an empty string** — Doppler's API has no delete;
  remove secrets permanently in the Doppler dashboard.

## Translations

Translation strings are provided by `@molecule/api-locales-secrets-doppler`.
