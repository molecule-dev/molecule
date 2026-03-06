# @molecule/api-password-bcrypt

Password hashing provider using bcryptjs for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-password-bcrypt
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
