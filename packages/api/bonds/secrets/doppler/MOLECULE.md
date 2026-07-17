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

  /**
   * When a Doppler fetch fails (missing/invalid token, network, non-2xx), whether
   * to fall back to `process.env` for reads (`get`/`getMany`).
   *
   * - `true` (**default**) — return the `process.env` value. Resilient (env is a
   *   legitimate secondary source, e.g. after `syncToEnv`), but the returned value
   *   may be STALE or WRONG relative to Doppler. The fallback is always logged at
   *   `error` severity so an outage/misconfig is visible — never silent.
   * - `false` — do NOT fall back; RE-THROW the Doppler error so callers get an
   *   explicit, hard failure instead of a possibly-wrong secret. Use this where a
   *   stale/wrong secret is worse than a hard failure.
   *
   * Defaults from the `DOPPLER_FALLBACK_TO_ENV` env var (set to `false`/`0`/`no`/`off`
   * to disable) when unset here, else `true`.
   */
  fallbackToEnv?: boolean
}
```

### Functions

#### `createDopplerProvider(options)`

Creates a Doppler secrets provider that fetches secrets from the Doppler API.
Caches secrets for the configured TTL. On a fetch failure, reads either fall
back to `process.env` (logged at `error` — default) or re-throw, per `fallbackToEnv`.

```typescript
function createDopplerProvider(options?: DopplerProviderOptions): SecretsProvider
```

- `options` — Doppler connection options (token, project, config, cache TTL, fallbackToEnv). Falls back to `DOPPLER_TOKEN` env var.

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
- **Read-failure policy is configurable and NEVER silent.** On ANY Doppler read
  failure (missing/invalid token, network, non-2xx) the error is logged at `error`
  severity, then `fallbackToEnv` decides: `true` (**default**) returns the
  `process.env` value — resilient, but that value may be STALE or WRONG relative to
  Doppler; `false` RE-THROWS so callers get a hard failure instead of a possibly-wrong
  secret. Set via the `fallbackToEnv` option or the `DOPPLER_FALLBACK_TO_ENV` env var
  (`false`/`0`/`no`/`off` to disable). Either way a broken Doppler config is visible in
  the logs — call `provider.isAvailable()` at boot to confirm Doppler is actually used.
- A SERVICE token scopes itself; a PERSONAL token additionally requires the
  `project` and `config` options on `createDopplerProvider()`.
- **`delete()` sets the secret to an empty string** — Doppler's API has no delete;
  remove secrets permanently in the Doppler dashboard.

## Translations

Translation strings are provided by `@molecule/api-locales-secrets-doppler`.
