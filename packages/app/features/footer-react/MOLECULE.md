# @molecule/app-footer-react

App-shell footer with About link, Privacy/Terms modals (i18n-loaded HTML), language picker, and version display

## Type
`feature`

## Installation
```bash
npm install @molecule/app-footer-react
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
`content.termsOfService`).

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
