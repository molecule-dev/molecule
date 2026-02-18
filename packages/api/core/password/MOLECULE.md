# @molecule/api-password

Password hashing interface for molecule.dev.

Defines the standard interface for password hashing providers.

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
- `saltRounds` — Number of salt rounds (cost factor); defaults to the `SALT_ROUNDS` env var or 10.

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
