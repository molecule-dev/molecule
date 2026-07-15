# @molecule/api-password-bcrypt

Password hashing provider using bcryptjs for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-password-bcrypt @molecule/api-password bcryptjs
```

## API

### Constants

#### `provider`

Password provider backed by the bcryptjs library.

```typescript
const provider: PasswordProvider
```

## Core Interface
Implements `@molecule/api-password` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-password'
import { provider } from '@molecule/api-password-bcrypt'

export function setupPasswordBcrypt(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-password` ^1.0.0

### Runtime Dependencies

- `@molecule/api-password`
- `bcryptjs`

bcrypt semantics a consumer must know (verified against the real bcryptjs):

- **Only the first 72 BYTES of a password are read** — passwords sharing the same
  first 72 bytes compare equal (multi-byte UTF-8 hits the cap sooner). Don't prepend
  long app-controlled prefixes before hashing.
- `compare()` returns `false` (never throws) for a malformed/non-bcrypt stored hash —
  an empty or corrupted `passwordHash` column is indistinguishable from a wrong
  password by design (no user enumeration). It DOES throw `Illegal arguments` when
  passed `undefined`/`null` — that means a wiring bug (e.g. an OAuth-only account with
  no password hash), not a wrong password; guard those rows before calling.
- The default cost reads `SALT_ROUNDS`, clamped to 10–16: cost is EXPONENTIAL and
  bcryptjs accepts absurd values (32 = hours per hash, silently).
