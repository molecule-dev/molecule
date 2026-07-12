# @molecule/api-password

Password hashing interface for molecule.dev.

Defines the standard interface for password hashing providers.

## Quick Start

```ts
import { hash, compare } from '@molecule/api-password'

// Register: store ONLY the hash.
const passwordHash = await hash(req.body.password)
await createUser({ email, passwordHash })

// Log in: constant-time compare; never `user.passwordHash === x`.
const ok = await compare(req.body.password, user.passwordHash)
if (!ok) return res.status(401).json({ error: 'Invalid credentials.' }) // don't reveal which field
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-password
```

## API

### Interfaces

#### `PasswordProvider`

Password provider interface.

All password providers must implement this interface.

```typescript
interface PasswordProvider {
  /**
   * Hashes a plain-text password.
   *
   * @param password - The plain-text password to hash
   * @param saltRounds - Number of salt rounds (cost factor)
   * @returns The hashed password string
   */
  hash(password: string, saltRounds?: number): Promise<string>

  /**
   * Compares a plain-text password against a hash.
   *
   * @param password - The plain-text password to check
   * @param passwordHash - The hash to compare against
   * @returns true if the password matches the hash
   */
  compare(password: string, passwordHash: string): Promise<boolean>
}
```

### Functions

#### `compare(password, passwordHash)`

Compares a plain-text password against a stored hash using the bonded provider.

```typescript
function compare(password: string, passwordHash: string): Promise<boolean>
```

- `password` — The plain-text password to check.
- `passwordHash` — The stored hash to compare against.

**Returns:** `true` if the password matches the hash.

#### `getProvider()`

Retrieves the bonded password provider, throwing if none is configured.

```typescript
function getProvider(): PasswordProvider
```

**Returns:** The bonded password provider.

#### `hash(password, saltRounds)`

Hashes a plain-text password using the bonded provider.

```typescript
function hash(password: string, saltRounds?: number): Promise<string>
```

- `password` — The plain-text password to hash.
- `saltRounds` — Number of salt rounds (cost factor); defaults to the `SALT_ROUNDS` env var or 12.

**Returns:** The resulting password hash string.

#### `hasProvider()`

Checks whether a password provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a password provider is bonded.

#### `setProvider(provider)`

Registers a password hashing provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: PasswordProvider): void
```

- `provider` — The password hashing provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| bcrypt | `@molecule/api-password-bcrypt` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

Use {@link hash} and {@link compare} from the bonded provider — NEVER roll your own
password hashing.

- **Never store, log, or return a password OR its hash to the client.** Persist only the
  hash server-side; a login response returns a session/token, never the hash.
- **Compare with {@link compare}, never `===`.** It is a constant-time check via the bond
  (bcrypt); a plain string/hash equality is a timing oracle and won't even match a salted
  hash.
- Do not implement your own MD5/SHA/salt scheme, and never put a password in a URL, query
  string, or GET request (it lands in logs/history).
- `hash()` uses `SALT_ROUNDS` (default 12) from config — don't hardcode a weaker cost.
