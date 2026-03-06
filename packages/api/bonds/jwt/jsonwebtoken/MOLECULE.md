# @molecule/api-jwt-jsonwebtoken

JSON Web Token provider using jsonwebtoken for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-jwt-jsonwebtoken
```

## API

### Constants

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
