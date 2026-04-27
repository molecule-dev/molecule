# @molecule/app-footer-react

App-shell footer — About link, Privacy/Terms modals, language picker, version.

Reproduces the Footer pattern that appears in 9 flagship apps with a single
axis of variation (external `WEBSITE_URL` vs internal `/about` for the About
link). The package detects `http`/`https` schemes in `aboutHref` and renders
either `<a target="_blank">` or `<Link>` accordingly.

Privacy/Terms HTML is loaded lazily through the optional `loadContent`
callback when supplied, then rendered from the bonded i18n catalog
(`content.privacyPolicy`, `content.termsOfService`).

## Quick Start

```tsx
import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME, WEBSITE_URL } from '../branding.js'
import { loadContent } from '../config.js'

export function Footer() {
  return (
    <AppFooter
      appName={APP_NAME}
      aboutHref={WEBSITE_URL}
      loadContent={loadContent}
    />
  )
}
```

For an app with an internal About page:

```tsx
<AppFooter appName={APP_NAME} aboutHref="/about" loadContent={loadContent} />
```

## Type
`feature`

## Installation

```bash
npm install @molecule/app-footer-react
```

## Peer dependencies

- `@molecule/app-react` — for `useTranslation` + `useVersion`
- `@molecule/app-ui` — for `getClassMap()`
- `@molecule/app-ui-react` — for `Modal` + `Icon`
- `react` ≥ 18
- `react-router-dom` ≥ 6

## API

### `<AppFooter>`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `appName` | `string` | _required_ | Display name interpolated into the "About {{appName}}" link. |
| `aboutHref` | `string` | _required_ | URL or path for About. URLs starting with `http`/`https` open in a new tab; otherwise rendered as `<Link>`. |
| `loadContent` | `(key: 'privacyPolicy' \| 'termsOfService') => Promise<void> \| void` | _none_ | Optional preloader called before opening the privacy/terms modals. |
| `className` | `string` | _none_ | Composed with `cm.footerBar` on the outer `<section>`. |
| `dataMolId` | `string` | _none_ | `data-mol-id` for AI-agent selectors. |

## i18n keys

The component reads these keys from the bonded i18n catalog (all have sensible
defaultValues so apps can ship without translations and fill them in later):

- `footer.version` — `v{{version}}`
- `footer.about` — `About {{appName}}`
- `footer.privacyPolicy` — `Privacy Policy`
- `footer.termsOfService` — `Terms of Service`
- `footer.language` — `Language`
- `content.privacyPolicy` — HTML body for the privacy modal
- `content.termsOfService` — HTML body for the terms modal

## Notes

- The privacy/terms content is rendered with `dangerouslySetInnerHTML`. Make
  sure the i18n source for `content.*` is trusted markup, not arbitrary user
  input.
- The language picker reads its locale list from the bonded i18n provider's
  `locales` array — no per-app config required.
