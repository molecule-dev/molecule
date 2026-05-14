# @molecule/app-auth-brand-header-react

`@molecule/app-auth-brand-header-react` — auth-page brand header
(gradient material-symbol chip + wordmark + tagline). Replaces 41
byte-unique fleet copies.

## Quick Start

```tsx
import { AuthBrandHeader } from '@molecule/app-auth-brand-header-react'
import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function MyAuthHeader() {
  return (
    <AuthBrandHeader
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="gavel"
      chipGradient="linear-gradient(135deg, #e05a2b, #f06a3b)"
      wordmarkColor="#e05a2b"
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-brand-header-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
