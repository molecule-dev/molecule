# @molecule/api-two-factor-otplib

Two-factor authentication provider using otplib for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-two-factor-otplib
```

## API

### Constants

#### `provider`

Two-factor authentication provider backed by otplib and qrcode.

```typescript
const provider: TwoFactorProvider
```

## Core Interface
Implements `@molecule/api-two-factor` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-two-factor` ^1.0.0
