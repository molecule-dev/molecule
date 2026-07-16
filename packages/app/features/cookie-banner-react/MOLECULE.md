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

#### `CookieBannerProps`

```typescript
interface CookieBannerProps {
  /** Cookie categories to offer (omit for a simple accept/reject banner). */
  categories?: CookieCategory[]
  /** Called when accept-all is clicked. */
  onAcceptAll?: () => void
  /** Called when reject-non-essential is clicked. */
  onRejectAll?: () => void
  /** Called when "Save preferences" is clicked. */
  onSave?: (enabled: Record<string, boolean>) => void
  /** Optional title. */
  title?: ReactNode
  /** Optional description. */
  description?: ReactNode
  /** Privacy policy link URL. */
  policyHref?: string
  /** Whether the banner is visible (controlled). */
  visible?: boolean
  /** Called when dismissed via Save / Accept / Reject. */
  onDismiss?: () => void
  /** Extra classes. */
  className?: string
}
```

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

#### `CookieBanner(props)`

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

- `props` — Component props (see {@link CookieBannerProps}).

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

The banner is UI-only — it stores nothing. `onAcceptAll` / `onRejectAll`
receive NO arguments (derive "all on"/"essential only" yourself); only
`onSave` receives the per-category `Record<string, boolean>`, and the
"Save preferences" button renders only when `categories` AND `onSave` are
provided and the user opened "Customize". Category toggle state is
captured from `categories` on first render — later prop changes do not
reset it. Visibility is controlled: keep `visible` false once consent is
stored. Text uses `cookieBanner.*` i18n keys (companion bond:
`@molecule/app-locales-cookie-banner`); `title`/`description`/category
labels you pass in should already be translated.
