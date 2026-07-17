# @molecule/api-encryption-aes

AES-256-GCM encryption provider for molecule.dev.

Uses Node.js built-in `crypto` for AES-256-GCM authenticated encryption,
SHA-256 hashing, and timing-safe verification. Supports key rotation with
versioned ciphertext format.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-encryption'
import { provider } from '@molecule/api-encryption-aes'

// Wire the provider at startup (reads ENCRYPTION_KEY from env)
setProvider(provider)

// Or create with explicit config
import { createProvider } from '@molecule/api-encryption-aes'
const customProvider = createProvider({ key: 'your-64-char-hex-key' })
setProvider(customProvider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-encryption-aes @molecule/api-encryption @molecule/api-secrets
```

## API

### Interfaces

#### `AesConfig`

Configuration options for the AES-256-GCM encryption provider.

```typescript
interface AesConfig {
  /** The current 256-bit encryption key, hex-encoded (64 hex characters). */
  key: string

  /**
   * Version of the current `key`. Ciphertext produced by `encrypt()` is tagged
   * with this version; `decrypt()` selects the key to use from the `v{n}` tag,
   * so it must be stable for a given key. `rotateKey()` advances it.
   *
   * @default 1
   */
  keyVersion?: number

  /**
   * Prior keys to seed the keyring with, so ciphertext encrypted before a
   * rotation still decrypts after this provider is (re)constructed — e.g. on a
   * process restart, when the in-memory rotation state would otherwise be lost.
   * Each entry maps a historical `v{n}` version to its key. The current `key`
   * (at {@link AesConfig.keyVersion}) always wins over any prior entry sharing
   * its version.
   *
   * @default []
   */
  priorKeys?: PriorKey[]
}
```

#### `AesEncryptionProvider`

AES-256-GCM encryption provider.

Fully satisfies the core `EncryptionProvider` contract, so it bonds anywhere
an `EncryptionProvider` is expected. It additionally exposes
{@link AesEncryptionProvider.pruneKeyVersions} to explicitly retire old keys
once their ciphertext has been re-encrypted — rotation alone never drops a
key, so it can never orphan data.

```typescript
interface AesEncryptionProvider extends EncryptionProvider {
  /**
   * Retires key versions from the in-memory keyring. Call this only AFTER every
   * ciphertext encrypted under those versions has been re-encrypted under the
   * current key — a pruned version can no longer decrypt its ciphertext.
   *
   * The current key version is ALWAYS retained (it cannot be pruned). By
   * default every non-current version is removed; pass `keep` to retain
   * specific older versions during a staged migration.
   *
   * @param keep - Old versions to retain in addition to the current one.
   * @returns The versions that were removed.
   */
  pruneKeyVersions(keep?: number[]): number[]
}
```

#### `PriorKey`

A historical (pre-rotation) key, retained so ciphertext encrypted under it
remains decryptable.

Ciphertext is tagged with the `v{version}` of the key that produced it; the
provider selects the matching key from its keyring at decrypt time. Seed the
keyring with the app's prior keys (from a secret store) so rotations survive
a process restart — see {@link AesConfig.priorKeys}.

```typescript
interface PriorKey {
  /** The key version tag this key decrypts (matches the `v{n}` ciphertext prefix). */
  version: number

  /** The 256-bit key, hex-encoded (64 hex characters). */
  key: string
}
```

### Functions

#### `createProvider(config)`

Creates an AES-256-GCM encryption provider.

Rotation is transition-safe: keys are held in a version-keyed keyring.
`encrypt()` tags each ciphertext with the current key version, `decrypt()`
selects the key named by that tag, and `rotateKey()` ADDS the new key while
keeping prior keys — so ciphertext from before a rotation still decrypts.
Retire old keys explicitly (once their data is re-encrypted) via
`pruneKeyVersions()`.

```typescript
function createProvider(config: AesConfig): AesEncryptionProvider
```

- `config` — Provider configuration including the hex-encoded 256-bit key.

**Returns:** An `AesEncryptionProvider` using AES-256-GCM.

### Constants

#### `encryptionAesSecretDefinitions`

Secret definitions required by the AES encryption bond.

```typescript
const encryptionAesSecretDefinitions: SecretDefinition[]
```

#### `provider`

Default AES-256-GCM encryption provider instance.

Lazily initializes on first property access using the `ENCRYPTION_KEY`
environment variable (hex-encoded 256-bit key). This singleton starts a
fresh keyring at version 1 on each process, so a rotation performed in a
prior process is NOT restored here — for rotation that survives restarts,
construct with `createProvider({ key, priorKeys })` seeding the historical
keys from your secret store.

```typescript
const provider: AesEncryptionProvider
```

## Core Interface
Implements `@molecule/api-encryption` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-encryption'
import { provider } from '@molecule/api-encryption-aes'

export function setupEncryptionAes(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-encryption` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `ENCRYPTION_KEY` *(required)* — AES-256 encryption key
  - **Auto-generated at scaffold — no manual setup.**

### Runtime Dependencies

- `@molecule/api-encryption`
- `@molecule/api-secrets`

- **`rotateKey()` is transition-safe — it never orphans data.** Keys live in
  a version-keyed keyring: `encrypt()` tags each ciphertext with the current
  `v{n}`, `decrypt()` reads that tag and selects the matching key, and
  `rotateKey(oldKey, newKey)` ADDS `newKey` at the next version while RETAINING
  the prior key(s). So ciphertext written before a rotation still decrypts
  afterward (the core contract's "previously encrypted data can still be
  decrypted during a transition period"). Once you have re-encrypted the old
  ciphertext under the new key, retire the old keys explicitly with
  `pruneKeyVersions()` — rotation alone deliberately keeps them.
- A ciphertext whose `v{n}` version is not in the keyring (unknown/pruned key)
  fails cleanly with a descriptive error — never a silent wrong decrypt.
- Rotation state is per-process and in-memory: the lazy `provider` singleton
  starts a fresh keyring at version 1 from `ENCRYPTION_KEY` on each process,
  so a rotation done in a prior process is not restored. For rotation that
  survives restarts, build with `createProvider({ key, priorKeys })`, seeding
  the historical `{ version, key }` entries from your secret store.
- `hash()`/`verify()` are plain unsalted SHA-256 — integrity checks only.
  NEVER use them for passwords; use `@molecule/api-password` with a bond
  like `@molecule/api-password-bcrypt`.
- `encrypt(plaintext, context)`: the optional `context` is GCM AAD — the
  SAME context string must be supplied to `decrypt()` or authentication
  fails.
