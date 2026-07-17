# @molecule/app-footer-react

App-shell footer — About link, Privacy/Terms surfaces (in-place modals or
route links), language-picker modal, and version display.

Reproduces the Footer pattern that appears in 9 flagship apps with one line
of variation (external WEBSITE_URL vs internal /about — handled here by
detecting `http`/`https` schemes in `aboutHref`).

## Quick Start

```tsx
import { AppFooter } from '@molecule/app-footer-react'

function Shell() {
  const loadContent = async (key: 'privacyPolicy' | 'termsOfService') => {
    // lazy-load the legal HTML into the i18n catalog before the modal opens
  }
  return <AppFooter appName="Bearing" aboutHref="https://example.com" loadContent={loadContent} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-footer-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
```

## API

### Interfaces

#### `AppFooterProps`

Props for the AppFooter component.

```typescript
interface AppFooterProps {
  /** Display name interpolated into the "About {{appName}}" link. */
  appName: string
  /**
   * URL or path for the About link. URLs starting with `http`/`https` are
   * rendered as `<a target="_blank">`; other values are rendered as a
   * `react-router-dom` `<Link>`.
   */
  aboutHref: string
  /**
   * How privacy/terms surfaces are presented:
   * - `'modal'` (default) — buttons that open in-place modals with HTML pulled
   *   from the bonded i18n catalog (`content.privacyPolicy` / `content.termsOfService`).
   *   Pass `loadContent` to lazy-load the catalog body before opening.
   * - `'route'` — `<Link to="/privacy">` / `<Link to="/terms">` for apps that
   *   render the legal pages on their own routes.
   */
  legalMode?: 'modal' | 'route'
  /**
   * Optional preloader called immediately before the privacy/terms modals
   * open. Only used when `legalMode === 'modal'`. Apps that lazy-load their
   * legal HTML pass `loadContent` from their config; apps that ship the
   * content statically can omit this.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
  /** Path for the Privacy Policy route. Only used when `legalMode === 'route'`. Default: `/privacy`. */
  privacyTo?: string
  /** Path for the Terms of Service route. Only used when `legalMode === 'route'`. Default: `/terms`. */
  termsTo?: string
  /** Extra className on the outer `<section>` (composed with `cm.footerBar`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `AppFooter({
  appName,
  aboutHref,
  legalMode = 'modal',
  loadContent,
  privacyTo = '/privacy',
  termsTo = '/terms',
  className,
  dataMolId,
})`

App-shell footer — About link, Privacy/Terms modals, language picker, version.

Reproduces the Footer pattern that appears in 9 flagship apps with one line
of variation (external WEBSITE_URL vs internal /about). Privacy/Terms HTML
is loaded lazily through the `loadContent` callback when supplied, then
rendered from the bonded i18n catalog (`content.privacyPolicy`,
`content.termsOfService`). Those keys are EMPTY by default (the app supplies
its real legal HTML); until it does, the modal shows a clear
`footer.legalNotConfigured` placeholder rather than a silently-blank modal.

```typescript
function AppFooter({
  appName,
  aboutHref,
  legalMode = 'modal',
  loadContent,
  privacyTo = '/privacy',
  termsTo = '/terms',
  className,
  dataMolId,
}: AppFooterProps): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
- `react-router-dom`

- Must render inside BOTH a `react-router-dom` router (the About link and
  `legalMode="route"` links are `<Link>` elements — they throw outside a
  Router) and `@molecule/app-react`'s `I18nProvider` — `useTranslation()`
  THROWS without it. `getClassMap()` needs a bonded ClassMap
  (e.g. `@molecule/app-ui-tailwind`); version display works unbonded (the
  version core falls back to a web provider).
- The privacy/terms modals render whatever HTML the i18n catalog holds under
  `content.privacyPolicy` / `content.termsOfService`. The companion
  `@molecule/app-locales-footer` bond ships those keys EMPTY BY DESIGN — a
  generic default policy would be legally wrong to present as an app's own —
  so the app MUST register its real legal HTML: add it to the app's locale
  catalog (scaffolded apps lazy-load it via `loadContent` from `config.ts`),
  wire the generic-template `@molecule/app-locales-legal-default` bond, or use
  `legalMode="route"` and render your own /privacy and /terms pages. Until
  content is registered the modal shows a clear `footer.legalNotConfigured`
  placeholder ("…the app owner must provide it.") instead of a blank modal —
  no fabricated legal text is ever shipped.
- The language picker lists every locale registered on the i18n provider —
  wire i18n with `@molecule/app-i18n-default-react`'s `setupI18nDefault()`
  (or prune manually) so only locales your app translated appear.

## Translations

Translation strings are provided by `@molecule/app-locales-footer`.
