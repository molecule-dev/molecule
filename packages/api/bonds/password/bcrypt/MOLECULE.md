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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-password` ^1.0.0
