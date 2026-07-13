# @molecule/app-i18n-react-i18next

react-i18next provider for molecule.dev.

Implements the I18nProvider interface using i18next and react-i18next.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-i18n'
import { createReactI18nextProvider } from '@molecule/app-i18n-react-i18next'

const provider = createReactI18nextProvider({
  defaultLocale: 'en',
  locales: [
    { code: 'en', name: 'English', translations: { ... } },
    { code: 'fr', name: 'French', translations: { ... } },
  ],
})

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-i18n-react-i18next
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
    defaultLocale?: string;
    /**
     * Fallback locale code.
     */
    fallbackLocale?: string;
    /**
     * Available locales with translations.
     */
    locales?: LocaleConfig[];
    /**
     * Enable language detection.
     */
    detection?: boolean;
    /**
     * Language detection options.
     */
    detectionOptions?: {
        order?: ('querystring' | 'cookie' | 'localStorage' | 'sessionStorage' | 'navigator' | 'htmlTag')[];
        lookupQuerystring?: string;
        lookupCookie?: string;
        lookupLocalStorage?: string;
        lookupSessionStorage?: string;
        caches?: ('localStorage' | 'cookie')[];
    };
    /**
     * Debug mode.
     */
    debug?: boolean;
    /**
     * Custom i18next initialization options.
     */
    i18nextOptions?: Partial<InitOptions>;
    /**
     * i18next plugins to apply before initialization.
     *
     * Each plugin is passed to `i18n.use()` before `i18n.init()`.
     * Useful for framework integrations (e.g. react-i18next's `initReactI18next`).
     */
    plugins?: unknown[];
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
     * Removes a locale by code, notifying subscribers so language pickers
     * built on `onLocaleChange` re-render their list. If the removed locale
     * is currently active, the caller is responsible for switching to a
     * fallback (e.g. `'en'`) BEFORE calling this — the provider will not
     * auto-fall-back on its own.
     *
     * Returns `true` if the locale was registered and removed, `false`
     * otherwise.
     */
    removeLocale(code: string): boolean;
    /**
     * Adds translations to a locale. Auto-creates the locale if it doesn't exist.
     *
     * **Fleet contract:** merges are DEEP, not a shallow spread — registering
     * two calls (e.g. two modules) that share a top-level namespace key merges
     * their subtrees instead of the second call clobbering the first's nested
     * translations wholesale. `@molecule/api-i18n-simple` implements the same
     * contract on the API side.
     */
    addTranslations(locale: string, translations: Translations, namespace?: string): void;
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
    t(key: string, values?: InterpolationValues, options?: {
        defaultValue?: string;
        count?: number;
    }): string;
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
    /**
     * Registers a lazily-loaded content module for automatic reload on locale changes.
     * All registered content is reloaded during `setLocale()` before listeners fire,
     * ensuring content is available on the first re-render with no flash.
     *
     * Idempotent: registering the same module name twice is a no-op.
     */
    registerContent?(module: string, loader: (locale: string) => Promise<void>): void;
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

#### `ReactI18nextProviderConfig`

Configuration options for the react-i18next provider.

Identical to I18nextProviderConfig — the React-specific setup
(initReactI18next plugin, Suspense) is handled automatically.

```typescript
type ReactI18nextProviderConfig = I18nextProviderConfig
```

### Functions

#### `createReactI18nextProvider(config)`

Creates a React-specific i18n provider that wraps the base i18next provider with the
`react-i18next` plugin. Enables `useSuspense` by default for React Suspense integration.

```typescript
function createReactI18nextProvider(config?: I18nextProviderConfig): I18nProvider & { i18n: i18n; initialize: () => Promise<void>; }
```

- `config` — Same as `I18nextProviderConfig` plus optional React-specific overrides.

**Returns:** An `I18nProvider` with the `react-i18next` plugin pre-registered.

#### `useI18n()`

React hook that provides translation, locale switching, and formatting functions
using `react-i18next` under the hood. Wraps `useTranslation()` into the molecule i18n interface.

```typescript
function useI18n(): { t: (key: string, values?: InterpolationValues) => string; locale: string; setLocale: (locale: string) => Promise<unknown>; formatNumber: (value: number, options?: NumberFormatOptions) => string; formatDate: (value: Date | number | string, options?: DateFormatOptions) => string; }
```

**Returns:** An object with `t` (translate), `locale`, `setLocale`, `formatNumber`, and `formatDate`.

### Constants

#### `I18nextProvider`

```typescript
const I18nextProvider: React.FunctionComponent<I18nextProviderProps>
```

#### `localeConfigToResources`

Converts an array of molecule `LocaleConfig` objects to the i18next resource bundle format.
Each locale's translations are placed under a `translation` namespace keyed by locale code.

```typescript
const localeConfigToResources: (locales: LocaleConfig[]) => Record<string, { translation: Translations; }>
```

#### `provider`

Default provider instance.

```typescript
const provider: I18nProvider & { i18n: i18n; initialize: () => Promise<void>; }
```

#### `Trans`

```typescript
const Trans: TransLegacy
```

#### `useTranslation`

```typescript
const useTranslation: UseTranslationLegacy
```

## Core Interface
Implements `@molecule/app-i18n` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider, setLocale, registerLocaleModule, registerContent } from '@molecule/app-i18n'
import { provider } from '@molecule/app-i18n-react-i18next'

export function setupI18nReactI18next(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

**Startup locale vs. `detection`:** with `detection: true` (the default),
`defaultLocale` is only the FALLBACK — the actual startup locale is
whatever the browser detector resolves (querystring, then `navigator`, by
default). Apps that want a pinned startup locale must pass
`detection: false` (or an explicit `i18nextOptions.lng`).

**`setLocale()` contract:** `createReactI18nextProvider()` is a thin
wrapper over `@molecule/app-i18n-i18next`'s `createI18nextProvider()`, so
its `setLocale()` THROWS for an unregistered locale — see that package's
remarks for the fleet-wide contract. The separate `useI18n()` hook below,
however, calls `react-i18next`'s raw `i18n.changeLanguage()` directly and
is NOT an `I18nProvider` — it does not throw for an unregistered locale.
