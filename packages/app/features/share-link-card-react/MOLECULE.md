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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
