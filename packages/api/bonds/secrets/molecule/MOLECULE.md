# @molecule/api-secrets-molecule

Molecule managed-vault secrets provider for molecule.dev.

Fetches a single app's secrets from molecule.dev's managed, per-app encrypted
vault at runtime, caches them with a TTL, serves stale cache on transient
failure, and only then falls back to `process.env`. The bootstrap token + app
id are the only secrets that live in the environment. It is also the seam
through which credential brokering is delivered with no app-code change.

## Quick Start

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-secrets-molecule'

bond('secrets', provider)
// ...then, unchanged: await resolveAll([ ...keys... ]) → syncToEnv → process.env
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-secrets-molecule @molecule/api-bond @molecule/api-i18n @molecule/api-secrets
```

## API

### Interfaces

#### `MoleculeSecretsProviderOptions`

Options for the molecule managed-vault secrets provider.

```typescript
interface MoleculeSecretsProviderOptions {
  /**
   * Per-app bootstrap token.
   * Falls back to the `MOLECULE_VAULT_TOKEN` env var.
   */
  token?: string

  /**
   * App identifier the vault scopes secrets to.
   * Falls back to the `MOLECULE_APP_ID` env var.
   */
  appId?: string

  /**
   * Vault base URL.
   * Falls back to the `MOLECULE_VAULT_URL` env var, then
   * `https://api.molecule.dev/v1/vault`.
   */
  vaultUrl?: string

  /**
   * Cache TTL in milliseconds.
   * @default 60000 (1 minute)
   */
  cacheTtl?: number

  /**
   * On fetch failure, serve last-good cached values (stale) before falling
   * back to `process.env`. When `false`, fall back to `process.env` immediately.
   * @default true
   */
  staleWhileError?: boolean
}
```

### Functions

#### `createMoleculeSecretsProvider(options)`

Creates a managed-vault secrets provider that fetches a single app's secrets
from molecule.dev's vault, caches them for the TTL, serves stale cache on
transient failure, and only then falls back to `process.env`.

```typescript
function createMoleculeSecretsProvider(options?: MoleculeSecretsProviderOptions): SecretsProvider
```

- `options` — Vault connection options. Falls back to `MOLECULE_*` env vars.

**Returns:** A `SecretsProvider` with get/getMany/set/delete/isAvailable/syncToEnv backed by the molecule vault.

### Constants

#### `provider`

Default provider instance, created from `MOLECULE_*` environment variables.

```typescript
const provider: SecretsProvider
```

#### `secretsMoleculeSecretDefinitions`

Secret definitions required by the molecule.dev vault secrets bond.

```typescript
const secretsMoleculeSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-secrets` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider, registerProvisioner, registerSecret, registerSecrets } from '@molecule/api-secrets'
import { provider } from '@molecule/api-secrets-molecule'

export function setupSecretsMolecule(): void {
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

- `MOLECULE_VAULT_TOKEN` *(required)* — molecule.dev vault token
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
- `MOLECULE_APP_ID` *(required)* — molecule.dev app ID
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
- `MOLECULE_VAULT_URL` *(optional)* — molecule.dev vault URL — default: `https://api.molecule.dev/v1/vault`
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-secrets`
