# @molecule/app-share-link-card-react

Share-link card with URL, copy button, optional QR slot, password toggle.

Exports `<ShareLinkCard>`.

## Quick Start

```tsx
import { ShareLinkCard } from '@molecule/app-share-link-card-react'

export function SharePanel() {
  const [passwordEnabled, setPasswordEnabled] = React.useState(false)
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
npm install @molecule/app-share-link-card-react
```

## API

### Functions

#### `ShareLinkCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .description
- `root0` — .url
- `root0` — .qr
- `root0` — .showQR
- `root0` — .passwordProtect
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
