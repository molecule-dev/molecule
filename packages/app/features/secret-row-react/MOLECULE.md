# @molecule/app-secret-row-react

Vault-style secret / credential row.

Exports `<SecretRow>` and `SecretRowData` type.

## Quick Start

```tsx
import { SecretRow } from '@molecule/app-secret-row-react'

<SecretRow
  secret={{
    id: 'sk-1',
    key: 'STRIPE_SECRET_KEY',
    value: 'sk_live_abc123',
    description: 'Stripe API key',
    daysUntilRotation: 14,
  }}
  onRotate={(s) => rotateSecret(s.id)}
  onDelete={(s) => deleteSecret(s.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-secret-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
