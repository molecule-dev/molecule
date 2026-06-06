# @molecule/app-cookie-banner-react

GDPR cookie consent banner.

Exports `<CookieBanner>` and `CookieCategory` type.

## Quick Start

```tsx
import { CookieBanner } from '@molecule/app-cookie-banner-react'

<CookieBanner
  visible={!consentGiven}
  policyHref="/privacy"
  categories={[
    { id: 'essential', label: 'Essential', required: true },
    { id: 'analytics', label: 'Analytics', defaultEnabled: false },
  ]}
  onAcceptAll={() => saveConsent('all')}
  onRejectAll={() => saveConsent('essential')}
  onSave={(enabled) => saveConsent(enabled)}
  onDismiss={() => setConsentGiven(true)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-cookie-banner-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
