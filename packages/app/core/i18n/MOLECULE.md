# @molecule/app-i18n

Internationalization (i18n) interface for molecule.dev.

Provides a unified API for translations and localization that works
with different i18n libraries (react-i18next, FormatJS, etc.).

## Quick Start

```tsx
import { t } from '@molecule/app-i18n'
// ALWAYS pass a defaultValue — it renders immediately as the English text.
<button>{t('settings.save', undefined, { defaultValue: 'Save' })}</button>
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-i18n
```

## API

### Interfaces

#### `DateFormatOptions`

Date format options.

```typescript
interface DateFormatOptions {
  /**
   * Date style.
   */
  dateStyle?: 'full' | 'long' | 'medium' | 'short'

  /**
   * Time style.
   */
  timeStyle?: 'full' | 'long' | 'medium' | 'short'

  /**
   * Custom format string (implementation-specific).
   */
  format?: string

  /**
   * Relative time.
   */
  relative?: boolean
}
```

#### `I18nProvider`

i18n provider interface.

All i18n providers must implement this interface.

```typescript
interface I18nProvider {
  /**
   * Gets the current locale.
   */
  getLocale(): string

  /**
   * Sets the current locale.
   *
   * **Fleet contract:** every conformant provider (the core simple provider,
   * `@molecule/api-i18n-simple`, `@molecule/app-i18n-i18next`, and
   * `@molecule/app-i18n-react-i18next`) MUST throw `Error('Locale "<code>"
   * not found')` when `locale` is not registered — via the constructor's
   * `initialLocales`/`locales` config, `addLocale()`, or `addTranslations()`
   * (all three register a locale). It must NOT silently degrade to
   * fallback-locale text while `getLocale()` reports the unregistered code —
   * that divergence makes a misconfigured locale switch indistinguishable
   * from a working one until a user notices the wrong language on screen.
   */
  setLocale(locale: string): Promise<void>

  /**
   * Gets all available locales.
   */
  getLocales(): LocaleConfig[]

  /**
   * Adds a locale.
   */
  addLocale(config: LocaleConfig): void

  /**
   * Removes a locale by code, notifying subscribers so language pickers
   * built on `onLocaleChange` re-render their list. If the removed locale
   * is currently active, the caller is responsible for switching to a
   * fallback (e.g. `'en'`) BEFORE calling this — the provider will not
   * auto-fall-back on its own.
   *
   * Returns `true` if the locale was registered and removed, `false`
   * otherwise.
   */
  removeLocale(code: string): boolean

  /**
   * Adds translations to a locale. Auto-creates the locale if it doesn't exist.
   *
   * **Fleet contract:** merges are DEEP, not a shallow spread — registering
   * two calls (e.g. two modules) that share a top-level namespace key merges
   * their subtrees instead of the second call clobbering the first's nested
   * translations wholesale. `@molecule/api-i18n-simple` implements the same
   * contract on the API side.
   */
  addTranslations(locale: string, translations: Translations, namespace?: string): void

  /**
   * Translates a key with optional interpolation values and pluralization.
   *
   * **Fleet plural contract (matches i18next's own key resolution order):**
   * when `options.count` is provided, the plural-suffixed key
   * (`` `${key}_${pluralForm}` ``, e.g. `item_one`/`item_few`/…, falling back
   * to `` `${key}_other` ``) is looked up FIRST and wins over the base `key`
   * if BOTH are registered. Only when no plural-suffixed key exists at all
   * does resolution fall back to the base key. A catalog that ships both
   * `item` and `item_one`/`item_other` therefore pluralizes identically
   * whichever provider is bonded.
   *
   * @returns The translated string, or the default value / key if not found.
   */
  t(
    key: string,
    values?: InterpolationValues,
    options?: { defaultValue?: string; count?: number },
  ): string

  /**
   * Checks if a translation key exists.
   *
   * **Fleet contract:** follows the SAME locale-resolution chain as `t()` —
   * the active locale, then the English fallback — so `exists(key) === true`
   * whenever `t(key)` would render real translated text (not the raw key or
   * an inline `defaultValue`). Do not narrow this to "only the active
   * locale's own catalog"; that made `exists()` return `false` for keys `t()`
   * happily rendered via the English fallback, and the answer differed by
   * provider.
   *
   * @returns `true` if the key has a translation.
   */
  exists(key: string): boolean

  /**
   * Formats a number according to the current locale.
   *
   * @returns The locale-formatted number string.
   */
  formatNumber(value: number, options?: NumberFormatOptions): string

  /**
   * Formats a date according to the current locale.
   *
   * @returns The locale-formatted date string.
   */
  formatDate(value: Date | number | string, options?: DateFormatOptions): string

  /**
   * Formats a relative time (e.g. "2 hours ago").
   *
   * @returns The locale-formatted relative time string.
   */
  formatRelativeTime(value: Date | number, options?: { unit?: Intl.RelativeTimeFormatUnit }): string

  /**
   * Formats a list (e.g. "A, B, and C").
   *
   * @returns The locale-formatted list string.
   */
  formatList(values: string[], options?: { type?: 'conjunction' | 'disjunction' | 'unit' }): string

  /**
   * Subscribes to locale changes.
   *
   * @returns An unsubscribe function.
   */
  onLocaleChange(listener: (locale: string) => void): () => void

  /**
   * Gets the text direction for the current locale.
   *
   * @returns `'ltr'` or `'rtl'`.
   */
  getDirection(): 'ltr' | 'rtl'

  /**
   * Checks if a translation key exists (alias for exists).
   */
  hasKey?(key: string): boolean

  /**
   * Checks if the provider is ready.
   */
  isReady?(): boolean

  /**
   * Registers a callback for when the provider is ready.
   */
  onReady?(callback: () => void): () => void

  /**
   * Registers a lazily-loaded content module for automatic reload on locale changes.
   * All registered content is reloaded during `setLocale()` before listeners fire,
   * ensuring content is available on the first re-render with no flash.
   *
   * Idempotent: registering the same module name twice is a no-op.
   */
  registerContent?(module: string, loader: (locale: string) => Promise<void>): void
}
```

#### `LocaleConfig`

Configuration for a supported locale (code, display name, text direction, translations or lazy loader).

```typescript
interface LocaleConfig {
  /**
   * Locale code (e.g., 'en-US', 'fr-FR').
   */
  code: string

  /**
   * Display name (e.g., 'English (US)', 'Francais').
   */
  name: string

  /**
   * Native display name.
   */
  nativeName?: string

  /**
   * Text direction.
   */
  direction?: 'ltr' | 'rtl'

  /**
   * Translations for this locale.
   */
  translations?: Translations

  /**
   * Lazy loader for translations. Called on first setLocale() to this locale.
   * When provided, translations can be omitted and will be loaded on demand.
   */
  loader?: () => Promise<Translations>
}
```

#### `NumberFormatOptions`

Number format options.

```typescript
interface NumberFormatOptions {
  /**
   * Number style.
   */
  style?: 'decimal' | 'currency' | 'percent' | 'unit'

  /**
   * Currency code (for currency style).
   */
  currency?: string

  /**
   * Minimum fraction digits.
   */
  minimumFractionDigits?: number

  /**
   * Maximum fraction digits.
   */
  maximumFractionDigits?: number

  /**
   * Use grouping separators.
   */
  useGrouping?: boolean
}
```

#### `PluralRule`

Plural form resolution rule mapping a count to a translation category (zero, one, two, few, many, other).

```typescript
interface PluralRule {
  /**
   * Zero count text.
   */
  zero?: string

  /**
   * One count text.
   */
  one?: string

  /**
   * Two count text.
   */
  two?: string

  /**
   * Few count text (for some languages).
   */
  few?: string

  /**
   * Many count text.
   */
  many?: string

  /**
   * Other count text (default).
   */
  other: string
}
```

#### `Translations`

Translation key/value map.

```typescript
interface Translations {
  [key: string]: string | Translations
}
```

### Types

#### `InterpolationValues`

Key-value map of interpolation variables passed to a translation string (e.g. `{ name: 'World' }`).

```typescript
type InterpolationValues = Record<string, string | number | boolean | Date>
```

#### `TranslateFunction`

Standalone translate function signature matching `I18nProvider.t()`.

```typescript
type TranslateFunction = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number },
) => string
```

#### `TranslateOptions`

Options for the translate function (default value, pluralization count).

```typescript
type TranslateOptions = { defaultValue?: string; count?: number }
```

### Classes

#### `I18nError`

An error that stores an i18n key instead of a pre-translated string.

**Always throw this instead of `new Error(t('key'))`.**
The plain-Error form translates at throw-time, permanently freezing the message
in whatever locale was active — switching languages later has no effect.
`I18nError` preserves the key so `useI18nError` (from `@molecule/app-react`)
can re-translate at render time, making displayed errors update automatically
when the locale changes.

The `fallback` argument (English text) becomes `error.message` for non-React
consumers such as loggers and unit tests.

### Functions

#### `addLocale(config)`

Registers a locale configuration (code, name, translations or loader).

```typescript
function addLocale(config: LocaleConfig): void
```

- `config` — The locale configuration to add.

**Returns:** Nothing.

#### `addTranslations(locale, translations, namespace)`

Adds translations to a locale, optionally under a namespace prefix.
Auto-creates the locale if it doesn't already exist.

```typescript
function addTranslations(locale: string, translations: Translations, namespace?: string): void
```

- `locale` — The locale code to add translations to.
- `translations` — The translation key-value map.
- `namespace` — Optional namespace prefix for the translation keys.

**Returns:** Nothing.

#### `createSimpleI18nProvider(initialLocale, initialLocales)`

Creates an in-memory i18n provider with translation lookup, interpolation,
pluralization, `Intl`-based formatting, lazy locale loading, and
locale change subscription.

```typescript
function createSimpleI18nProvider(initialLocale?: string, initialLocales?: LocaleConfig[]): I18nProvider
```

- `initialLocale` — The initial active locale code (defaults to `'en'`).
- `initialLocales` — Pre-registered locale configurations with optional translations.

**Returns:** A fully functional `I18nProvider` instance.

#### `deepMerge(target, source)`

Recursively merges source translation entries into a COPY of the target
object, preserving existing keys and overwriting only the leaves that
conflict. Used by `addTranslations()` so registering two modules that
share a top-level namespace key merges their subtrees instead of one
module's translations clobbering the other's — matching the deep-merge
contract documented on `I18nProvider.addTranslations`.

```typescript
function deepMerge(target: Translations, source: Translations): Translations
```

- `target` — The base translations object (not mutated).
- `source` — The translations to merge on top.

**Returns:** A new object with `source` deep-merged over `target`.

#### `formatDate(value, options)`

Formats a date according to the current locale.

```typescript
function formatDate(value: string | number | Date, options?: DateFormatOptions): string
```

- `value` — The date to format (Date object, timestamp, or date string).
- `options` — Date formatting options (dateStyle, timeStyle, relative).

**Returns:** The locale-formatted date string.

#### `formatNumber(value, options)`

Formats a number according to the current locale.

```typescript
function formatNumber(value: number, options?: NumberFormatOptions): string
```

- `value` — The number to format.
- `options` — Number formatting options (style, currency, fraction digits).

**Returns:** The locale-formatted number string.

#### `formatRelativeTime(value, options)`

Formats a relative time (e.g. "2 hours ago", "in 3 days").

```typescript
function formatRelativeTime(value: number | Date, options?: { unit?: Intl.RelativeTimeFormatUnit; }): string
```

- `value` — The date or timestamp to express relative to now.
- `options` — Optional settings; `unit` forces the difference to be expressed in that unit.

**Returns:** The locale-formatted relative time string.

#### `getLocale()`

Returns the current locale code (e.g. `'en'`, `'fr'`).

```typescript
function getLocale(): string
```

**Returns:** The active locale code string.

#### `getNestedValue(obj, key)`

Retrieves a translation string from a nested translations object using
dot-notation keys. First checks for a flat key match (e.g. `'auth.login.email'`
as a direct property), then traverses nested objects.

```typescript
function getNestedValue(obj: Translations, key: string): string | undefined
```

- `obj` — The translations object to search.
- `key` — The dot-notation key (e.g. `'auth.login.title'`).

**Returns:** The translation string, or `undefined` if not found.

#### `getPluralForm(count, locale)`

Returns the CLDR plural category for a given count and locale
using the `Intl.PluralRules` API.

```typescript
function getPluralForm(count: number, locale: string): string
```

- `count` — The numeric count to determine the plural form for.
- `locale` — The BCP 47 locale string (e.g. `'en'`, `'fr'`, `'ar'`).

**Returns:** The plural category: `'zero'`, `'one'`, `'two'`, `'few'`, `'many'`, or `'other'`.

#### `getProvider()`

Retrieves the bonded i18n provider. If none is bonded,
automatically creates a simple in-memory provider.

```typescript
function getProvider(): I18nProvider
```

**Returns:** The active i18n provider instance.

#### `interpolate(text, values)`

Replaces `{{key}}` placeholders in a string with values from the
provided map. Dates are formatted with `toLocaleDateString()`;
other values are converted via `String()`.

```typescript
function interpolate(text: string, values: InterpolationValues): string
```

- `text` — The template string containing `\{\{key\}\}` placeholders.
- `values` — A map of placeholder names to their replacement values.

**Returns:** The interpolated string with all matched placeholders replaced.

#### `onLocaleChange(listener)`

Subscribes to locale changes. The listener fires whenever `setLocale()` is called.

```typescript
function onLocaleChange(listener: (locale: string) => void): () => void
```

- `listener` — Callback invoked with the new locale code.

**Returns:** An unsubscribe function.

#### `registerContent(module, loader)`

Registers a lazily-loaded content module for automatic reload on locale changes.
All registered content is reloaded during `setLocale()` before listeners fire.

```typescript
function registerContent(module: string, loader: (locale: string) => Promise<void>): void
```

- `module` — Unique content module identifier (e.g. `'privacyPolicy'`).
- `loader` — Function that loads and merges translations for a given locale.

#### `registerLocaleModule(moduleExports)`

Registers all locale exports from a locale bond module.
Handles `zhTW` → `zh-TW` camelCase-to-code mapping automatically.

```typescript
function registerLocaleModule(moduleExports: Record<string, unknown>): void
```

- `moduleExports` — The `import * as locales` object from a locale bond package.

#### `setLocale(locale)`

Sets the active locale and loads its translations if a loader is configured.

```typescript
function setLocale(locale: string): Promise<void>
```

- `locale` — The locale code to activate (e.g. `'en'`, `'fr'`).

**Returns:** A promise that resolves when the locale is activated and translations are loaded.

#### `setProvider(provider)`

Registers an i18n provider as the active singleton.

```typescript
function setProvider(provider: I18nProvider): void
```

- `provider` — The i18n provider implementation to bond.

#### `t(key, values, options, options, options)`

Translates a key using the bonded i18n provider, with optional
interpolation values and pluralization.

```typescript
function t(key: string, values?: InterpolationValues, options?: { defaultValue?: string; count?: number; }): string
```

- `key` — Dot-delimited translation key (e.g. `'auth.login.title'`).
- `values` — Interpolation values to substitute into the translation.
- `options` — Translation options including `defaultValue` and `count` for pluralization.
- `options` — .defaultValue - Fallback string if the key is not found.
- `options` — .count - Count value for pluralization.

**Returns:** The translated string, or the `defaultValue` / key if not found.

### Constants

#### `simpleProvider`

Default in-memory i18n provider instance with `'en'` locale.
Used as a fallback when no bond package provides a provider.

```typescript
const simpleProvider: I18nProvider
```

## Available Providers

| Provider | Package |
|----------|---------|
| i18next | `@molecule/app-i18n-i18next` |
| react-i18next | `@molecule/app-i18n-react-i18next` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-logger` ^1.0.0

Every user-visible string must go through `t()` — never hardcode UI text. And
ALWAYS supply `{ defaultValue: 'English text' }`: a bare `t('settings.save')`
renders the raw KEY string ("settings.save") in the UI until a translation for
that key loads, so the default is what the user actually sees. Translation keys
are optional polish layered on top; the `defaultValue` is the real copy. Add
keys to the app's `locales/en/ui.ts` (and per-locale `{code}/ui.ts`) — not in
feature packages.

Interpolation tokens use **DOUBLE braces** `{{var}}`, never single `{var}` — a
single brace is NOT interpolated and renders LITERALLY (you see "{name}" on the
page). This applies to BOTH the `defaultValue` and any matching locale-file
entry: `t('hero', { tagline }, { defaultValue: 'Eat well — {{tagline}}' })` and
`heroTitle: 'Eat well — {{tagline}}'`. The locale entry takes priority over the
`defaultValue`, so a single-brace locale entry shows `{tagline}` even when the
default is correct — the #1 i18n footgun.

**Fleet provider contract** (every `I18nProvider` — this package's own
`createSimpleI18nProvider`, `@molecule/api-i18n-simple`,
`@molecule/app-i18n-i18next`, `@molecule/app-i18n-react-i18next` — must
behave identically; see the JSDoc on each `I18nProvider` method for the
normative text):

- `setLocale()` THROWS for an unregistered locale — never silently
  degrades to fallback text while `getLocale()` reports the bad code.
- `t()` prefers the plural-suffixed key (`key_one`/`key_other`/…) over the
  base `key` whenever `options.count` is provided (matches i18next).
- `addTranslations()` deep-merges nested translation objects.
- `exists(key)` follows the same locale-fallback chain as `t()` (active
  locale, then English), so it agrees with whether `t(key)` renders real
  translated text.

## Translations

Translation strings are provided by `@molecule/app-locales-i18n`.
