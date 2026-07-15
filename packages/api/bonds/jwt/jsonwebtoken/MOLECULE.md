# @molecule/api-jwt-jsonwebtoken

JSON Web Token provider using jsonwebtoken for molecule.dev.

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
