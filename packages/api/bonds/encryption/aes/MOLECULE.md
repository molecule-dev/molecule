# @molecule/api-encryption-aes

AES-256-GCM encryption provider for molecule.dev.

Uses Node.js built-in `crypto` for AES-256-GCM authenticated encryption,
SHA-256 hashing, and timing-safe verification. Supports key rotation with
versioned ciphertext format.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-encryption-aes
```

## Usage

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

#### `provider`

Default AES-256-GCM encryption provider instance.

Lazily initializes on first property access using the `ENCRYPTION_KEY`
environment variable (hex-encoded 256-bit key).

```typescript
const provider: EncryptionProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-encryption` ^1.0.0
