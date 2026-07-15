# @molecule/app-i18n-default-react

`@molecule/app-i18n-default-react` — default i18n bond setup.

Bundles the 80-language fleet definitions + `setupI18nDefault()`
helper that wires the molecule i18n provider with English bootstrap,
lazy-loading for every other locale, common-bond translation merging,
and locale persistence via the bonded storage provider.

Replaces the 113-line `bonds/i18n-default.ts` that every flagship
app shipped byte-identically.

## Quick Start

```ts
import { setupI18nDefault } from '@molecule/app-i18n-default-react'

// `en` is the app's eagerly-imported English UI translations —
// in your app: `import { ui as en } from '../locales/en/ui.js'`.
// The lazy loader MUST stay in the app so Vite can code-split
// each locale's ui.ts into its own chunk.
const lazyLoadUi = (code: string) =>
  import(`../locales/${code}/ui.ts`).then((m) => m.ui)

setupI18nDefault({ enUi: en, lazyLoadUi })
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-i18n-default-react @molecule/app-i18n @molecule/app-locales-common @molecule/app-storage
```

## API

### Interfaces

#### `LanguageDefinition`

Static metadata for the 80 languages supported by the molecule
flagship fleet. Each entry includes the locale code, native name,
and text direction.

Lifted from the byte-identical per-app `bonds/i18n-default.ts`
files that every fleet app used to ship.

```typescript
interface LanguageDefinition {
  code: string
  name: string
  direction: 'ltr' | 'rtl'
}
```

#### `SetupI18nDefaultOptions`

Options accepted by `setupI18nDefault`.

`enUi` is the eagerly-loaded English UI translations (typically
imported as `import { ui as en } from '../locales/en/ui.js'` in
the consuming app). `lazyLoadUi` is a per-locale loader the app
provides — it MUST remain in the app so Vite can code-split the
per-language `ui.ts` bundles correctly.

```typescript
interface SetupI18nDefaultOptions {
  /** Eagerly-imported English ui.ts translations. */
  enUi: Record<string, string>
  /**
   * Per-locale lazy loader for the app's `ui.ts`. The callback runs
   * on demand when the i18n provider switches to that locale; merging
   * with the universal common-locale bond is handled inside this
   * package, so callers only need to return the app-specific UI keys.
   */
  lazyLoadUi: (code: string) => Promise<Record<string, string>>
  /**
   * Per-package locale bonds to eagerly register with the i18n provider.
   *
   * Each entry is a star-imported `@molecule/app-locales-<name>` module.
   * Every property that LOOKS like a locale (matches `^[a-z]{2,3}(-[A-Z]{2,4})?$`
   * and resolves to a non-empty object of string values) is registered
   * via `provider.addTranslations(lang, translations)` at setup time.
   *
   * @example
   * ```ts
   * import * as authLocales from '@molecule/app-locales-auth'
   * import * as legalLocales from '@molecule/app-locales-legal-default'
   *
   * setupI18nDefault({
   *   enUi: en,
   *   lazyLoadUi,
   *   packageLocales: [authLocales, legalLocales],
   * })
   * ```
   *
   * Per-app `ui.ts` (registered via `lazyLoadUi`) still overrides
   * package-locale translations because it's merged in second.
   */
  packageLocales?: readonly PackageLocaleBond[]
  /**
   * Optional allowlist of locale codes the app actually supports.
   *
   * When provided, only these locales are registered with the i18n
   * provider — so `useTranslation().locales` (and therefore any
   * language-picker UI built on top of it) renders ONLY supported
   * choices. `'en'` is always included implicitly; the array doesn't
   * need to list it explicitly.
   *
   * When omitted, every entry in the fleet's 80-language
   * {@link LANGUAGE_DEFINITIONS} list is registered (back-compat).
   *
   * Typical call-site idiom uses Vite's `import.meta.glob` to
   * auto-detect which `ui.ts` files in the app's `locales/` directory
   * have non-empty translation objects:
   *
   * ```ts
   * const eager = import.meta.glob<{ ui: Record<string, string> }>(
   *   '../locales/*\/ui.ts',
   *   { eager: true },
   * )
   * const supportedLocales = Object.entries(eager)
   *   .filter(([, m]) => Object.keys(m.ui).length > 0)
   *   .map(([p]) => p.match(/locales\/([^/]+)\/ui\.ts$/)![1])
   * ```
   */
  supportedLocales?: readonly string[]
}
```

### Types

#### `PackageLocaleBond`

Shape of a per-package locale bond passed via `packageLocales`.

Locale bond packages (`@molecule/app-locales-<name>`) follow a
uniform layout: each `<lang>.ts` file exports a constant matching
the locale code, and the package's `src/index.ts` re-exports all
of them as a barrel. Consumers do `import * as bond from
'@molecule/app-locales-<name>'` to get an object keyed by locale
code (with `types` and a few non-locale exports also present).

This type captures the "anything except the types module is a
`{lang: translations}` map" shape via Record<string, unknown> with
a per-key runtime filter at registration time.

```typescript
type PackageLocaleBond = Record<string, unknown>
```

### Functions

#### `setupI18nDefault({
  enUi,
  lazyLoadUi,
  packageLocales,
  supportedLocales,
})`

Wire the molecule i18n provider with the fleet's 80-language list
plus a default English bootstrap, then persist the user's locale
selection through the bonded storage provider (if available).

Replaces the 113-line per-app `bonds/i18n-default.ts` that every
flagship app shipped byte-identically — only the `enUi` import
and `lazyLoadUi` template literal had to live in the app to
preserve Vite's per-language code splitting.

```typescript
function setupI18nDefault({
  enUi,
  lazyLoadUi,
  packageLocales,
  supportedLocales,
}: SetupI18nDefaultOptions): I18nProvider
```

### Constants

#### `LANGUAGE_DEFINITIONS`

Canonical 80-language definition list. The names are written in
the language's own script for the language picker dropdown.

```typescript
const LANGUAGE_DEFINITIONS: readonly LanguageDefinition[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-locales-common` ^1.0.0
- `@molecule/app-storage` ^1.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-locales-common`
- `@molecule/app-storage`
