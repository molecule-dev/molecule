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
  /** The 256-bit encryption key, hex-encoded (64 hex characters). */
  key: string

  /**
   * Optional key version for tracking which key encrypted a given value.
   * Used during key rotation to identify ciphertext that needs re-encryption.
   *
   * @default 1
   */
  keyVersion?: number
}
```

### Functions

#### `createProvider(config)`

Creates an AES-256-GCM encryption provider.

```typescript
function createProvider(config: AesConfig): EncryptionProvider
```

- `config` — Provider configuration including the hex-encoded 256-bit key.

**Returns:** An `EncryptionProvider` using AES-256-GCM.

### Constants

#### `encryptionAesSecretDefinitions`

Secret definitions required by the AES encryption bond.

```typescript
const encryptionAesSecretDefinitions: SecretDefinition[]
```

#### `provider`

Default AES-256-GCM encryption provider instance.

Lazily initializes on first property access using the `ENCRYPTION_KEY`
environment variable (hex-encoded 256-bit key).

```typescript
const provider: EncryptionProvider
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

- **`rotateKey()` does NOT keep old ciphertexts readable.** It swaps the
  single in-memory key; `decrypt()` always uses the CURRENT key and ignores
  the `v{n}` ciphertext prefix (informational only). After rotation,
  anything encrypted under the old key fails to decrypt ("Unsupported state
  or unable to authenticate data") — re-encrypt every stored ciphertext
  with the new key as part of the rotation, or don't rotate. (The core
  contract's "previously encrypted data can still be decrypted during a
  transition period" is not implemented by this bond.)
- Rotation state is per-process and in-memory: on restart the lazy
  `provider` re-reads `ENCRYPTION_KEY` and the key version resets.
- `hash()`/`verify()` are plain unsalted SHA-256 — integrity checks only.
  NEVER use them for passwords; use `@molecule/api-password` with a bond
  like `@molecule/api-password-bcrypt`.
- `encrypt(plaintext, context)`: the optional `context` is GCM AAD — the
  SAME context string must be supplied to `decrypt()` or authentication
  fails.
