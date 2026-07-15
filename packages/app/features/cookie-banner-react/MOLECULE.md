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
npm install @molecule/app-cookie-banner-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `CookieCategory`

Describes a single cookie category offered in the granular consent UI.

```typescript
interface CookieCategory {
  id: string
  label: ReactNode
  description?: ReactNode
  /** Whether this category is required (always on). */
  required?: boolean
  /** Initial enabled state. */
  defaultEnabled?: boolean
}
```

### Functions

#### `CookieBanner(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

GDPR / cookie-consent banner. Two modes:
- Simple: Accept / Reject buttons.
- Granular: Per-category toggles + "Save preferences".

Apps own the actual cookie storage logic.

```typescript
function CookieBanner({
  categories,
  onAcceptAll,
  onRejectAll,
  onSave,
  title,
  description,
  policyHref,
  visible = true,
  onDismiss,
  className,
}: CookieBannerProps): ReactElement<unknown, string | JSXElementConstructor<any>> | null
```

- `root0` — *
- `root0` — .categories
- `root0` — .onAcceptAll
- `root0` — .onRejectAll
- `root0` — .onSave
- `root0` — .title
- `root0` — .description
- `root0` — .policyHref
- `root0` — .visible
- `root0` — .onDismiss
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
