# @molecule/api-i18n

Internationalization (i18n) interface for molecule.dev API.

Mirrors `@molecule/app-i18n` for the server side. Provides a unified API
for translations and localization with per-request locale support.

## Type
`core`

## Installation
```bash
npm install @molecule/api-i18n
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
   */
  setLocale(locale: string): void

  /**
   * Gets all available locales.
   */
  getLocales(): LocaleConfig[]

  /**
   * Adds a locale.
   */
  addLocale(config: LocaleConfig): void

  /**
   * Adds translations to a locale. Auto-creates the locale if it doesn't exist.
   */
  addTranslations(locale: string, translations: Translations, namespace?: string): void

  /**
   * Translates a key.
   */
  t(
    key: string,
    values?: InterpolationValues,
    options?: { defaultValue?: string; count?: number; locale?: string },
  ): string

  /**
   * Checks if a translation exists.
   */
  exists(key: string): boolean

  /**
   * Formats a number.
   */
  formatNumber(value: number, options?: NumberFormatOptions): string

  /**
   * Formats a date.
   */
  formatDate(value: Date | number | string, options?: DateFormatOptions): string

  /**
   * Formats a relative time (e.g., "2 hours ago").
   */
  formatRelativeTime(value: Date | number, options?: { unit?: Intl.RelativeTimeFormatUnit }): string

  /**
   * Formats a list (e.g., "A, B, and C").
   */
  formatList(values: string[], options?: { type?: 'conjunction' | 'disjunction' | 'unit' }): string

  /**
   * Gets the text direction for the current locale.
   */
  getDirection(): 'ltr' | 'rtl'
}
```

#### `LocaleConfig`

Server-side locale configuration (code, display name, text direction, translations or loader).

```typescript
interface LocaleConfig {
  /**
   * Locale code (e.g., 'en', 'fr', 'zh-TW').
   */
  code: string

  /**
   * Display name (e.g., 'English', 'Francais').
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

Key-value map of interpolation variables for server-side translation strings.

```typescript
type InterpolationValues = Record<string, string | number | boolean | Date>
```

#### `TranslateFunction`

Translate Function type.

```typescript
type TranslateFunction = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number; locale?: string },
) => string
```

#### `TranslateOptions`

Translate Options type.

```typescript
type TranslateOptions = { defaultValue?: string; count?: number; locale?: string }
```

### Functions

#### `addLocale(config)`

Registers a locale configuration (code, display name, direction, translations).

```typescript
function addLocale(config: LocaleConfig): void
```

- `config` — The locale configuration to add.

**Returns:** Nothing.

#### `addTranslations(locale, translations, namespace)`

Adds translation key-value pairs for a locale. Auto-creates the locale if
it doesn't already exist. Translations are deep-merged with existing ones.

```typescript
function addTranslations(locale: string, translations: Translations, namespace?: string): void
```

- `locale` — The locale code to add translations for (e.g. `'en'`, `'fr'`).
- `translations` — The translation key-value map to merge.
- `namespace` — Optional namespace prefix to nest translations under.

**Returns:** Nothing.

#### `createSimpleI18nProvider(defaultLocale)`

Creates a simple in-memory i18n provider with translation lookup, interpolation,
`Intl`-based number/date/relative-time formatting, and RTL detection.
Used as the default provider when no bond package is installed.

```typescript
function createSimpleI18nProvider(defaultLocale?: string): I18nProvider
```

- `defaultLocale` — The initial locale code (defaults to `'en'`).

**Returns:** A fully functional `I18nProvider` backed by in-memory translation maps.

#### `formatDate(value, options)`

Formats a date according to the current locale using `Intl.DateTimeFormat`.

```typescript
function formatDate(value: string | number | Date, options?: DateFormatOptions): string
```

- `value` — The date to format (Date object, timestamp, or ISO string).
- `options` — Formatting options (dateStyle, timeStyle, relative).

**Returns:** The locale-formatted date string.

#### `formatNumber(value, options)`

Formats a number according to the current locale using `Intl.NumberFormat`.

```typescript
function formatNumber(value: number, options?: NumberFormatOptions): string
```

- `value` — The number to format.
- `options` — Formatting options (style, currency, fraction digits, grouping).

**Returns:** The locale-formatted number string.

#### `formatRelativeTime(value)`

Formats a relative time string (e.g. "2 hours ago", "in 3 days") using
`Intl.RelativeTimeFormat`.

```typescript
function formatRelativeTime(value: number | Date): string
```

- `value` — The date or timestamp to express relative to now.

**Returns:** The locale-formatted relative time string.

#### `getLocale()`

Returns the current locale code (e.g. `'en'`, `'fr'`, `'zh-TW'`).

```typescript
function getLocale(): string
```

**Returns:** The active locale code.

#### `getNestedValue(obj, key)`

Resolves a dot-notation key (e.g. `'auth.login.email'`) against a nested
translations object. Checks for a flat key match first, then traverses
the nested structure.

```typescript
function getNestedValue(obj: Translations, key: string): string | undefined
```

- `obj` — The translations object to search.
- `key` — The dot-notation key to resolve.

**Returns:** The translation string if found, or `undefined`.

#### `getPluralForm(count, locale)`

Returns the CLDR plural category (`'zero'`, `'one'`, `'two'`, `'few'`, `'many'`,
or `'other'`) for a given count and locale using `Intl.PluralRules`.

```typescript
function getPluralForm(count: number, locale: string): string
```

- `count` — The numeric count to determine the plural form for.
- `locale` — The locale code to use for plural rule selection (e.g. `'en'`, `'ar'`).

**Returns:** The plural category string.

#### `getProvider()`

Retrieves the bonded i18n provider. If none is bonded, auto-creates and
bonds a simple in-memory provider with `'en'` as the default locale.

```typescript
function getProvider(): I18nProvider
```

**Returns:** The bonded i18n provider.

#### `hasProvider()`

Checks whether an i18n provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an i18n provider is bonded.

#### `interpolate(text, values)`

Replaces `{{variable}}` placeholders in a translation string with their
corresponding values. Date values are formatted with `toLocaleDateString()`.

```typescript
function interpolate(text: string, values: InterpolationValues): string
```

- `text` — The translation string containing `{{variable}}` placeholders.
- `values` — Key-value map of interpolation values.

**Returns:** The string with placeholders replaced by their values.

#### `registerLocaleModule(moduleExports)`

Registers all locale exports from a locale bond module. Iterates the module's
named exports, treating each object-valued export as a translation map keyed
by locale code (e.g. `en`, `fr`, `zhTW`). Handles `zhTW` → `zh-TW` mapping.

```typescript
function registerLocaleModule(moduleExports: Record<string, unknown>): void
```

- `moduleExports` — The module's named exports (e.g. `{ en: {...}, fr: {...} }`).

#### `setLocale(locale)`

Sets the active locale. Throws if the locale hasn't been registered.

```typescript
function setLocale(locale: string): void
```

- `locale` — The locale code to switch to (e.g. `'fr'`, `'zh-TW'`).

**Returns:** Nothing.

#### `setProvider(provider)`

Registers an i18n provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: I18nProvider): void
```

- `provider` — The i18n provider implementation to bond.

#### `t(key, values, options, options, options, options)`

Translates a key using the bonded i18n provider. Falls back to `defaultValue` or
the key itself if no translation is found. Supports interpolation via `{{variable}}`
syntax and per-request locale override.

On the API side, use the `locale` option for per-request translation
(e.g., emails, notifications) to avoid global state race conditions:

```ts
// Error responses — use default locale (English)
t('user.error.usernameRequired')

// Emails — translate in user's locale
t('user.email.resetSubject', { appName }, { locale: userLocale })
```

```typescript
function t(key: string, values?: InterpolationValues, options?: { defaultValue?: string; count?: number; locale?: string; }): string
```

- `key` — The translation key (dot-notation, e.g. `'user.error.notFound'`).
- `values` — Optional interpolation values to substitute `{{variable}}` placeholders.
- `options` — Optional settings.
- `options` — .defaultValue - Fallback string if no translation is found.
- `options` — .count - Count for pluralization.
- `options` — .locale - Override locale for this specific translation.

**Returns:** The translated string, or `defaultValue`, or the key if nothing matches.

### Constants

#### `simpleProvider`

Default simple in-memory i18n provider instance with `'en'` locale.
Used as a fallback when no bond package provides a provider.

```typescript
const simpleProvider: I18nProvider
```

## Available Providers

| Provider | Package |
|----------|---------|
| Simple | `@molecule/api-i18n-simple` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
