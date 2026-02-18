# @molecule/app-i18n-i18next

Framework-agnostic i18next provider for molecule.dev.

Implements the I18nProvider interface using i18next directly,
without any framework-specific bindings. Suitable for Vue, Angular,
Svelte, Solid, and any other framework.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-i18n-i18next
```

## Usage

```typescript
import { setProvider } from '@molecule/app-i18n'
import { createI18nextProvider } from '@molecule/app-i18n-i18next'

const provider = createI18nextProvider({
  defaultLocale: 'en',
  locales: [
    { code: 'en', name: 'English', translations: { ... } },
    { code: 'fr', name: 'French', translations: { ... } },
  ],
})

setProvider(provider)
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
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    /**
     * Time style.
     */
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
    /**
     * Custom format string (implementation-specific).
     */
    format?: string;
    /**
     * Relative time.
     */
    relative?: boolean;
}
```

#### `I18nextProviderConfig`

Configuration options for the i18next provider.

```typescript
interface I18nextProviderConfig {
  /**
   * Default locale code.
   */
  defaultLocale?: string

  /**
   * Fallback locale code.
   */
  fallbackLocale?: string

  /**
   * Available locales with translations.
   */
  locales?: LocaleConfig[]

  /**
   * Enable language detection.
   */
  detection?: boolean

  /**
   * Language detection options.
   */
  detectionOptions?: {
    order?: (
      | 'querystring'
      | 'cookie'
      | 'localStorage'
      | 'sessionStorage'
      | 'navigator'
      | 'htmlTag'
    )[]
    lookupQuerystring?: string
    lookupCookie?: string
    lookupLocalStorage?: string
    lookupSessionStorage?: string
    caches?: ('localStorage' | 'cookie')[]
  }

  /**
   * Debug mode.
   */
  debug?: boolean

  /**
   * Custom i18next initialization options.
   */
  i18nextOptions?: Partial<InitOptions>

  /**
   * i18next plugins to apply before initialization.
   *
   * Each plugin is passed to `i18n.use()` before `i18n.init()`.
   * Useful for framework integrations (e.g. react-i18next's `initReactI18next`).
   */
  plugins?: unknown[]
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
    getLocale(): string;
    /**
     * Sets the current locale.
     */
    setLocale(locale: string): Promise<void>;
    /**
     * Gets all available locales.
     */
    getLocales(): LocaleConfig[];
    /**
     * Adds a locale.
     */
    addLocale(config: LocaleConfig): void;
    /**
     * Adds translations to a locale.
     */
    addTranslations(locale: string, translations: Translations, namespace?: string): void;
    /**
     * Translates a key with optional interpolation values and pluralization.
     *
     * @returns The translated string, or the default value / key if not found.
     */
    t(key: string, values?: InterpolationValues, options?: {
        defaultValue?: string;
        count?: number;
    }): string;
    /**
     * Checks if a translation key exists in the current locale.
     *
     * @returns `true` if the key has a translation.
     */
    exists(key: string): boolean;
    /**
     * Formats a number according to the current locale.
     *
     * @returns The locale-formatted number string.
     */
    formatNumber(value: number, options?: NumberFormatOptions): string;
    /**
     * Formats a date according to the current locale.
     *
     * @returns The locale-formatted date string.
     */
    formatDate(value: Date | number | string, options?: DateFormatOptions): string;
    /**
     * Formats a relative time (e.g. "2 hours ago").
     *
     * @returns The locale-formatted relative time string.
     */
    formatRelativeTime(value: Date | number, options?: {
        unit?: Intl.RelativeTimeFormatUnit;
    }): string;
    /**
     * Formats a list (e.g. "A, B, and C").
     *
     * @returns The locale-formatted list string.
     */
    formatList(values: string[], options?: {
        type?: 'conjunction' | 'disjunction' | 'unit';
    }): string;
    /**
     * Subscribes to locale changes.
     *
     * @returns An unsubscribe function.
     */
    onLocaleChange(listener: (locale: string) => void): () => void;
    /**
     * Gets the text direction for the current locale.
     *
     * @returns `'ltr'` or `'rtl'`.
     */
    getDirection(): 'ltr' | 'rtl';
    /**
     * Checks if a translation key exists (alias for exists).
     */
    hasKey?(key: string): boolean;
    /**
     * Checks if the provider is ready.
     */
    isReady?(): boolean;
    /**
     * Registers a callback for when the provider is ready.
     */
    onReady?(callback: () => void): () => void;
}
```

#### `LocaleConfig`

Configuration for a supported locale (code, display name, text direction, translations or lazy loader).

```typescript
interface LocaleConfig {
    /**
     * Locale code (e.g., 'en-US', 'fr-FR').
     */
    code: string;
    /**
     * Display name (e.g., 'English (US)', 'Francais').
     */
    name: string;
    /**
     * Native display name.
     */
    nativeName?: string;
    /**
     * Text direction.
     */
    direction?: 'ltr' | 'rtl';
    /**
     * Translations for this locale.
     */
    translations?: Translations;
    /**
     * Lazy loader for translations. Called on first setLocale() to this locale.
     * When provided, translations can be omitted and will be loaded on demand.
     */
    loader?: () => Promise<Translations>;
}
```

#### `NumberFormatOptions`

Number format options.

```typescript
interface NumberFormatOptions {
    /**
     * Number style.
     */
    style?: 'decimal' | 'currency' | 'percent' | 'unit';
    /**
     * Currency code (for currency style).
     */
    currency?: string;
    /**
     * Minimum fraction digits.
     */
    minimumFractionDigits?: number;
    /**
     * Maximum fraction digits.
     */
    maximumFractionDigits?: number;
    /**
     * Use grouping separators.
     */
    useGrouping?: boolean;
}
```

#### `Translations`

Translation key/value map.

```typescript
interface Translations {
    [key: string]: string | Translations;
}
```

### Types

#### `InterpolationValues`

Key-value map of interpolation variables passed to a translation string (e.g. `{ name: 'World' }`).

```typescript
type InterpolationValues = Record<string, string | number | boolean | Date>;
```

### Functions

#### `createI18nextProvider(config)`

Creates a framework-agnostic i18n provider backed by i18next. Supports eager and lazy-loaded
locale translations, browser language detection, custom plugins, and Intl-based number/date/list formatting.

```typescript
function createI18nextProvider(config?: I18nextProviderConfig): I18nProvider & { i18n: I18nInstance; initialize: () => Promise<void>; }
```

- `config` — i18next provider configuration including `defaultLocale`, `locales` (with optional `loader` for lazy loading), `detection` flag, `debug`, `plugins`, and raw `i18nextOptions`.

**Returns:** An `I18nProvider` with translation, formatting, locale management methods, plus the underlying `i18n` instance and `initialize()` function.

#### `localeConfigToResources(locales)`

Converts an array of molecule `LocaleConfig` objects to the i18next resource bundle format.
Each locale's translations are placed under a `translation` namespace keyed by locale code.

```typescript
function localeConfigToResources(locales: LocaleConfig[]): Record<string, { translation: Translations; }>
```

- `locales` — The locale configurations with code and translations.

**Returns:** An i18next-compatible resources object (e.g. `{ en: { translation: { ... } } }`).

### Constants

#### `provider`

Default provider instance.

```typescript
const provider: I18nProvider & { i18n: I18nInstance; initialize: () => Promise<void>; }
```

## Core Interface
Implements `@molecule/app-i18n` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
