# @molecule/api-jwt-jsonwebtoken

JSON Web Token provider using jsonwebtoken for molecule.dev.

Implements the `@molecule/api-jwt` `JwtProvider` contract (`sign`,
`verify`, `decode`) as a thin wrapper over the `jsonwebtoken` library.
Key sourcing, algorithms, and usage rules live in `@molecule/api-jwt` —
its convenience functions supply `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`
(env-provided or self-generated) automatically.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-jwt'
import { provider } from '@molecule/api-jwt-jsonwebtoken'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-jwt-jsonwebtoken @molecule/api-jwt @molecule/api-secrets jsonwebtoken
npm install -D @types/jsonwebtoken
```

## API

### Constants

#### `jwtJsonwebtokenSecretDefinitions`

Secret definitions required by the jsonwebtoken JWT bond.

```typescript
const jwtJsonwebtokenSecretDefinitions: SecretDefinition[]
```

#### `provider`

JWT provider backed by the jsonwebtoken library.

```typescript
const provider: JwtProvider
```

## Core Interface
Implements `@molecule/api-jwt` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-jwt'
import { provider } from '@molecule/api-jwt-jsonwebtoken'

export function setupJwtJsonwebtoken(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-jwt` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `JWT_PRIVATE_KEY` *(required)* — JWT signing key (RSA private)
  - **Auto-generated at scaffold — no manual setup.**
- `JWT_PUBLIC_KEY` *(required)* — JWT verification key (RSA public)
  - **Auto-generated at scaffold — no manual setup.**

### Runtime Dependencies

- `@molecule/api-jwt`
- `@molecule/api-secrets`
- `jsonwebtoken`

- **`verify()` force-enables expiry and not-before checks** — any
  `ignoreExpiration`/`ignoreNotBefore` passed in options is overridden
  (deliberate hardening: an expired token ALWAYS fails). Don't build
  accept-expired-token flows on this bond; issue short-lived tokens and
  refresh instead (see the core's refresh recipe).
- Provider-level `sign`/`verify` throw if called without a key argument;
  the core's convenience wrappers inject the keys — call those, not the
  provider methods, unless you are supplying custom keys.
