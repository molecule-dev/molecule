# @molecule/api-encryption

Encryption core interface for molecule.dev.

Provides the `EncryptionProvider` interface for field-level encryption,
decryption, hashing, and key rotation. Bond a concrete provider
(e.g. `@molecule/api-encryption-aes`) at startup via `setProvider()`.

## Quick Start

```typescript
import { setProvider, encrypt, decrypt, hash, verify } from '@molecule/api-encryption'
import { provider } from '@molecule/api-encryption-aes'

// Wire the provider at startup
setProvider(provider)

// Field-level encryption for sensitive data at rest
const ciphertext = await encrypt(accessToken)
const plaintext = await decrypt(ciphertext)

// Integrity hashing (checksums, dedupe keys) — NOT for passwords
const checksum = await hash(documentBody)
const untampered = await verify(documentBody, checksum)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-encryption @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `EncryptionConfig`

Configuration options for an encryption provider.

```typescript
interface EncryptionConfig {
  /** The encryption key (or key identifier for KMS-backed providers). */
  key: string

  /** Optional algorithm identifier (provider-specific). */
  algorithm?: string

  /** Optional key version for rotation tracking. */
  keyVersion?: number
}
```

#### `EncryptionProvider`

Encryption provider interface.

All encryption providers must implement this interface to provide
field-level encryption, decryption, hashing, and key rotation.

```typescript
interface EncryptionProvider {
  /**
   * Encrypts a plaintext string.
   *
   * @param plaintext - The data to encrypt.
   * @param context - Optional additional authenticated data (AAD) for
   *   authenticated encryption schemes.
   * @returns The encrypted ciphertext string (typically base64-encoded).
   */
  encrypt(plaintext: string, context?: string): Promise<string>

  /**
   * Decrypts a ciphertext string.
   *
   * @param ciphertext - The encrypted data to decrypt.
   * @param context - Optional additional authenticated data (AAD) that was
   *   used during encryption.
   * @returns The decrypted plaintext string.
   */
  decrypt(ciphertext: string, context?: string): Promise<string>

  /**
   * Produces a one-way hash of the given data.
   *
   * @param data - The data to hash.
   * @returns The hash string (hex or base64 encoded).
   */
  hash(data: string): Promise<string>

  /**
   * Verifies that data matches a previously computed hash.
   *
   * @param data - The original data to verify.
   * @param hash - The hash to verify against.
   * @returns `true` if the data matches the hash.
   */
  verify(data: string, hash: string): Promise<boolean>

  /**
   * Rotates the encryption key. Re-encrypts internal state or markers
   * so that future operations use the new key while previously encrypted
   * data can still be decrypted during a transition period.
   *
   * @param oldKey - The current encryption key.
   * @param newKey - The new encryption key to rotate to.
   */
  rotateKey(oldKey: string, newKey: string): Promise<void>
}
```

### Functions

#### `decrypt(ciphertext, context)`

Decrypts a ciphertext string using the bonded provider.

```typescript
function decrypt(ciphertext: string, context?: string): Promise<string>
```

- `ciphertext` — The encrypted data to decrypt.
- `context` — Optional additional authenticated data (AAD).

**Returns:** The decrypted plaintext string.

#### `encrypt(plaintext, context)`

Encrypts a plaintext string using the bonded provider.

```typescript
function encrypt(plaintext: string, context?: string): Promise<string>
```

- `plaintext` — The data to encrypt.
- `context` — Optional additional authenticated data (AAD).

**Returns:** The encrypted ciphertext string.

#### `getProvider()`

Retrieves the bonded encryption provider, throwing if none is configured.

```typescript
function getProvider(): EncryptionProvider
```

**Returns:** The bonded encryption provider.

#### `hash(data)`

Produces a one-way hash of the given data using the bonded provider.

```typescript
function hash(data: string): Promise<string>
```

- `data` — The data to hash.

**Returns:** The hash string.

#### `hasProvider()`

Checks whether an encryption provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an encryption provider is bonded.

#### `rotateKey(oldKey, newKey)`

Rotates the encryption key using the bonded provider.

```typescript
function rotateKey(oldKey: string, newKey: string): Promise<void>
```

- `oldKey` — The current encryption key.
- `newKey` — The new encryption key to rotate to.

**Returns:** Resolves when rotation completes successfully.

#### `setProvider(provider)`

Registers an encryption provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: EncryptionProvider): void
```

- `provider` — The encryption provider implementation to bond.

#### `verify(data, hashed)`

Verifies that data matches a previously computed hash.

```typescript
function verify(data: string, hashed: string): Promise<boolean>
```

- `data` — The original data to verify.
- `hashed` — The hash to verify against.

**Returns:** `true` if the data matches the hash.

## Available Providers

| Provider | Package |
|----------|---------|
| Encryption | `@molecule/api-encryption-aes` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **NEVER hash passwords with `hash()`.** It is a fast, unsalted integrity
  hash (e.g. SHA-256 in the AES bond) — fine for checksums and dedupe keys,
  catastrophic for credentials. Passwords go through
  `@molecule/api-password` (salted, slow KDF).
- **The key is a server-side secret** (e.g. the AES bond's `ENCRYPTION_KEY`,
  auto-generated at scaffold). Never hardcode, log, or expose it — and a
  lost key makes every ciphertext permanently unreadable, so treat key
  changes as a rotation (`rotateKey`), never an edit.
- **Ciphertext is opaque.** An encrypted DB column cannot be filtered,
  sorted, or `like`-searched on its plaintext. Encrypt narrow sensitive
  fields (tokens, PII), not fields you query by.
- **`context` (AAD) must match at decrypt.** If you pass a context to
  `encrypt(value, context)`, the identical context is required to decrypt.
  Binding a ciphertext to e.g. its record id stops cross-row copy-paste —
  but then the id can never change.
- `decrypt()` throws on a wrong key or tampered ciphertext — treat that as
  corruption/misconfiguration to surface, not a condition to retry.
