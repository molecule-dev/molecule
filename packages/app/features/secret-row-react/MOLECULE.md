# @molecule/app-secret-row-react

Vault-style secret / credential row.

Exports `<SecretRow>` and the `SecretRowData` type (`{ id, key, value,
version?, daysUntilRotation?, lastRotatedAt?, description? }`). Renders
key + masked value with Show/Hide and Copy buttons, an optional rotation
status (an "Expired" tag / "Rotate in {n}d" countdown / "Last rotated
{value}" note), plus optional Rotate / Delete buttons (shown only when
`onRotate` / `onDelete` are passed). `maskChar` customizes the mask glyph
(default `'•'`).

## Quick Start

```tsx
import { SecretRow } from '@molecule/app-secret-row-react'

function VaultRow({ rotate, remove }: {
  rotate: (id: string) => void
  remove: (id: string) => void
}) {
  return (
    <SecretRow
      secret={{
        id: 'sk-1',
        key: 'STRIPE_SECRET_KEY',
        value: 'sk_live_abc123',
        description: 'Stripe API key',
        daysUntilRotation: 14,
      }}
      onRotate={(s) => rotate(s.id)}
      onDelete={(s) => remove(s.id)}
    />
  )
}
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
  /**
   * Days until the secret should be rotated. A negative value renders an
   * "Expired" tag; zero or a positive value renders a "Rotate in {n}d"
   * countdown.
   */
  daysUntilRotation?: number
  /** Last-rotation timestamp (ISO string or any node); rendered as "Last rotated {value}". */
  lastRotatedAt?: ReactNode
  /** Additional description (e.g. "Stripe API key"). */
  description?: ReactNode
}
```

#### `SecretRowProps`

Props accepted by the {@link SecretRow} component.

```typescript
interface SecretRowProps {
  secret: SecretRowData
  /** Called when the user clicks Rotate. */
  onRotate?: (secret: SecretRowData) => void
  /** Called when the user clicks Delete. */
  onDelete?: (secret: SecretRowData) => void
  /** Mask character for the hidden value. Defaults to `'•'`. */
  maskChar?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SecretRow(props)`

Secret / credential row for vault UIs. Masked by default; the user
toggles reveal, can copy to clipboard, sees an "Expired" tag when
`daysUntilRotation` is negative or a "Rotate in {n}d" countdown when it is
zero/positive, and a "Last rotated {value}" note when `lastRotatedAt` is set.

```typescript
function SecretRow({
  secret,
  onRotate,
  onDelete,
  maskChar = '•',
  className,
}: SecretRowProps): JSX.Element
```

- `props` — Component props (see {@link SecretRowProps}).

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

- Rotation status renders from two fields: `daysUntilRotation < 0` shows an
  "Expired" tag, `daysUntilRotation >= 0` shows a "Rotate in {n}d" countdown,
  and `lastRotatedAt` (when set) renders a "Last rotated {value}" note. Omit
  a field to hide its chip.
- Copy silently does nothing when `navigator.clipboard` is unavailable
  (non-HTTPS origins, some webviews) — no error, no fallback.
- The version chip renders as `v{version}` — pass `version="2"`, not "v2".
- Delete fires immediately — add your own confirmation dialog before
  calling a destructive API.
- Throws unless inside `<I18nProvider>` with a bonded ClassMap.
  Translations: `@molecule/app-locales-secret-row`.

## Translations

Translation strings are provided by `@molecule/app-locales-secret-row`.
