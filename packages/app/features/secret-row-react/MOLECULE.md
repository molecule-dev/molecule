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
npm install @molecule/app-secret-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SecretRowData`

Data model for a single secret/credential entry in a vault UI.

```typescript
interface SecretRowData {
  id: string
  key: string
  /** Current value (revealed only after the user clicks "Show"). */
  value: string
  /** Version number / label. */
  version?: ReactNode
  /** Days until rotation — negative = expired. */
  daysUntilRotation?: number
  /** ISO timestamp of last rotation. */
  lastRotatedAt?: ReactNode
  /** Additional description (e.g. "Stripe API key"). */
  description?: ReactNode
}
```

### Functions

#### `SecretRow(root0, root0, root0, root0, root0, root0)`

Secret / credential row for vault UIs. Masked by default; the user
toggles reveal, can copy to clipboard, and sees rotation status.

```typescript
function SecretRow({
  secret,
  onRotate,
  onDelete,
  maskChar = '•',
  className,
}: SecretRowProps): JSX.Element
```

- `root0` — *
- `root0` — .secret
- `root0` — .onRotate
- `root0` — .onDelete
- `root0` — .maskChar
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
