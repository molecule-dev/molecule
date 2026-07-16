# @molecule/app-share-link-card-react

Share-link card with URL, copy button, optional QR slot, password toggle.

Exports `<ShareLinkCard>` (the internal read-only URL + copy-button field
it renders is not exported). Card props: `url` (required), `title?`,
`description?`, `qr?` (your QR ReactNode) + `showQR?` (BOTH must be set
for the QR to render — `showQR` defaults to false), `passwordProtect?`
(`{ enabled, onChange, label? }` renders a Switch row), `className?`,
`dataMolId?`.

## Quick Start

```tsx
import { useState } from 'react'

import { ShareLinkCard } from '@molecule/app-share-link-card-react'

function SharePanel() {
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  return (
    <ShareLinkCard
      title="Share this project"
      description="Anyone with the link can view."
      url="https://app.example.com/p/abc123"
      passwordProtect={{ enabled: passwordEnabled, onChange: setPasswordEnabled }}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-share-link-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ShareLinkCardProps`

Props accepted by the {@link ShareLinkCard} component.

```typescript
interface ShareLinkCardProps {
  /** Card title. */
  title?: ReactNode
  /** Supporting copy under the title. */
  description?: ReactNode
  /** The URL users can copy/share. */
  url: string
  /** Optional QR rendering slot — pass your own QR component from the app side. */
  qr?: ReactNode
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: {
    enabled: boolean
    onChange: (enabled: boolean) => void
    label?: ReactNode
  }
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `ShareLinkCard(props)`

Share-link card — bundles a read-only URL field + copy button, an
optional QR code slot, and an optional password-protect toggle.

QR rendering is slot-based so apps can bring their own QR library
(`qrcode.react`, `@molecule/app-qr-code` when it exists, etc.).

```typescript
function ShareLinkCard({
  title,
  description,
  url,
  qr,
  showQR,
  passwordProtect,
  className,
  dataMolId,
}: ShareLinkCardProps): JSX.Element
```

- `props` — Component props (see {@link ShareLinkCardProps}).

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

- QR rendering is slot-based: bring your own QR component (e.g.
  qrcode.react) and pass BOTH `qr` and `showQR` — `qr` alone renders
  nothing.
- Copy silently does nothing when `navigator.clipboard` is unavailable
  (non-HTTPS origins) — no error, no fallback.
- The card's internal copy field is a trimmed local variant of
  `@molecule/app-copy-link-field-react` (which adds `label`, `onCopy`,
  `feedbackMs`, `size`); use that package directly when you need a
  standalone copy field.
- The password toggle is UI-only: persisting and enforcing the password
  is entirely the app/server's job.
- Throws unless inside `<I18nProvider>` with a bonded ClassMap.
  Translations: `@molecule/app-locales-share-link-card`.

## Translations

Translation strings are provided by `@molecule/app-locales-share-link-card`.
