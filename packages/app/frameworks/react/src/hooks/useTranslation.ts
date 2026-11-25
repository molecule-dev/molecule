/**
 * React hook for internationalization.
 *
 * @module
 */

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
  RichTranslateFunction,
  TranslateOptions,
} from '@molecule/app-i18n'
import { createRichTranslator, getProvider, I18nError } from '@molecule/app-i18n'

import { I18nContext } from '../contexts.js'
import type { UseTFunction, UseTranslationResult } from '../types.js'

/**
 * Reads rich catalog messages from the active provider. Call the returned
 * translation function in render so it follows locale and catalog changes.
 *
 * @returns The locale-reactive rich translation function.
 */
export function useRichTranslation(): RichTranslateFunction {
  const translate = useT()
  return useMemo(() => createRichTranslator(translate), [translate])
}

/**
 * Hook to access the i18n provider: the one the nearest `I18nProvider` supplies, otherwise
 * the bonded `@molecule/app-i18n` provider, which is the one the static `t` reads. A component
 * can therefore translate through {@link useTranslation} wherever the static `t` works, and it
 * re-renders when the locale changes.
 *
 * @returns The i18n provider from context, or the bonded provider.
 */
export function useI18nProvider(): I18nProvider {
  return useContext(I18nContext) ?? getProvider()
}

/** What a component reads from the provider, rebuilt only when the provider's state changes. */
interface LocaleSnapshot {
  /** Changes on every notification, revision and locale switch. */
  key: string
  /** The locale the snapshot was built for. */
  locale: string
  /** One list per `key`. */
  locales: ReturnType<I18nProvider['getLocales']>
  /** One translation function per locale. */
  t: I18nProvider['t']
}

/** The provider listener `useLocaleSnapshot` attaches, in the shape useSyncExternalStore reads. */
interface LocaleStore {
  listener: () => void
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => LocaleSnapshot
}

/**
 * Creates the locale store of one provider (see {@link useLocaleSnapshot}).
 *
 * @param provider - The i18n provider.
 * @returns The store: its listener, subscription and snapshot.
 */
function createLocaleStore(provider: I18nProvider): LocaleStore {
  let notifications = 0
  let cached: LocaleSnapshot | null = null
  const onChanges = new Set<() => void>()
  return {
    listener: (): void => {
      notifications += 1
      onChanges.forEach((onChange) => onChange())
    },
    subscribe: (onChange: () => void): (() => void) => {
      onChanges.add(onChange)
      return () => {
        onChanges.delete(onChange)
      }
    },
    // The cache holds only what the provider itself says (never a prop or the
    // component's state), so a render React throws away fills it with what a
    // committed render would.
    getSnapshot: (): LocaleSnapshot => {
      const locale = provider.getLocale()
      const key = `${notifications}:${provider.getRevision?.() ?? 0}:${locale}`
      if (cached?.key === key) return cached
      cached = {
        key,
        locale,
        locales: provider.getLocales(),
        t:
          cached?.locale === locale
            ? cached.t
            : (k: string, values?: InterpolationValues, options?: TranslateOptions): string =>
                provider.t(k, values, options),
      }
      return cached
    },
  }
}

const useLocaleSubscriptionEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Subscribes the calling component to the provider's locale notifications
 * through `useSyncExternalStore`, like the package's other store hooks.
 *
 * The snapshot counts this hook's notifications, carries the active locale,
 * and includes the provider's `getRevision()` when it exposes one. A
 * notification, a locale switch, or a revision bump re-renders the component.
 *
 * The one provider listener is attached in a layout effect, and
 * `useSyncExternalStore` subscribes to it later, in the passive phase, then
 * reads the snapshot again. Every layout effect of a commit runs before any
 * mount effect, so a notification fired in a child's or an earlier sibling's
 * `useEffect` is still counted and re-renders this component.
 *
 * The revision covers what the listener cannot: a change announced BEFORE the
 * listener exists — from a child's or an earlier sibling's layout effect, or
 * while React keeps the tree hidden (`<Activity mode="hidden">`) with effects
 * unmounted. The snapshot re-read after subscribing sees the new revision and
 * re-renders with the current text. `createSimpleI18nProvider` implements
 * `getRevision`; a provider written before it existed falls back to the
 * listener count, and a locale switch is still caught for it through the
 * locale in the snapshot. Only a notification fired during the render, before
 * this hook runs, remains unobservable — register translations at module scope
 * or in an effect, never while rendering.
 *
 * The snapshot is one cached object per notification: its `locales` list is
 * rebuilt only then, and its `t` only on a locale switch (`useTranslation`'s
 * `t` follows the locale, so text memoized on it refreshes; `useT`'s keeps one
 * identity). Reading them from the snapshot costs no extra render.
 *
 * @param provider - The i18n provider from context.
 * @returns The snapshot, a new object on every notification, revision and locale switch.
 */
function useLocaleSnapshot(provider: I18nProvider): LocaleSnapshot {
  const store = useMemo(() => createLocaleStore(provider), [provider])
  useLocaleSubscriptionEffect(() => provider.onLocaleChange(store.listener), [provider, store])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

/**
 * Hook for internationalization.
 *
 * @returns Translation function and locale management
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale, formatNumber } = useTranslation()
 *
 * return (
 *   <div>
 *     <h1>{t('welcome.title', { name: 'User' })}</h1>
 *     <p>{formatNumber(1234.56, { style: 'currency', currency: 'USD' })}</p>
 *     <select value={locale} onChange={(e) => setLocale(e.target.value)}>
 *       <option value="en">English</option>
 *       <option value="es">Spanish</option>
 *     </select>
 *   </div>
 * )
 * ```
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()
  // `locales` is a new list once per notification and the same list otherwise,
  // so an effect that depends on it stays stable. `t` is one function per
  // provider and locale: its identity follows a locale switch, so text memoized
  // on it (or a React.memo child that takes `t` as a prop) refreshes after the
  // switch — `useT()` is the identity-stable form.
  const { locales, t } = useLocaleSnapshot(provider)

  // Read from the provider on every render, never copied into state: a
  // replaced provider, or a switch that landed before the subscription, shows
  // its own values on the first render instead of the previous ones.
  const locale = provider.getLocale()
  const direction = provider.getDirection()

  // Memoized action wrappers
  const setLocale = useCallback((code: string) => provider.setLocale(code), [provider])

  const formatNumber = useCallback(
    (value: number, options?: NumberFormatOptions) => provider.formatNumber(value, options),
    [provider],
  )

  const formatDate = useCallback(
    (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
    [provider],
  )

  return {
    t,
    locale,
    setLocale,
    locales,
    formatNumber,
    formatDate,
    direction,
  }
}

/**
 * Hook to get just the translation function.
 *
 * The returned function keeps ONE identity for as long as the provider
 * instance is unchanged, so it is safe as an effect dependency: an effect
 * written as `useEffect(..., [t])` does not re-run on ordinary re-renders or on
 * a locale change. The hook still re-renders the calling component on every
 * locale notification (including `addTranslations` for the active locale), so
 * text it reads while rendering is current. A value memoized on `[t]` alone
 * keeps the old text after a locale switch: `useMemo(() => t(...), [t])`, or a
 * `React.memo` child that receives `t` as a prop. Call `useT()` inside that
 * child, or add `useLocale()` to the dependencies.
 *
 * Call it in either of two compatible forms:
 *
 * - `t(key, values?, options?)` — the provider signature from
 *   `@molecule/app-i18n`, e.g. `t('cart.total', { total })`.
 * - `t(key, fallback, options?)` — a shorthand for the common inline-English
 *   call: a string second argument is the `defaultValue`, so
 *   `t('cart.empty', 'Your cart is empty')` equals
 *   `t('cart.empty', undefined, { defaultValue: 'Your cart is empty' })`.
 *   Interpolation and pluralization still work:
 *   `t('cart.items', '{{count}} items', { count: 3 })`.
 *
 * @returns The translation function (stable identity while the provider is
 *   unchanged).
 */
export function useT(): UseTFunction {
  const provider = useI18nProvider()
  useLocaleSnapshot(provider)
  return useCallback(
    (
      key: string,
      valuesOrDefault?: InterpolationValues | string,
      options?: TranslateOptions,
    ): string =>
      typeof valuesOrDefault === 'string'
        ? provider.t(key, undefined, { ...options, defaultValue: valuesOrDefault })
        : provider.t(key, valuesOrDefault, options),
    [provider],
  ) as UseTFunction
}

/**
 * Hook to get the current locale.
 *
 * @returns The current locale code
 */
export function useLocale(): string {
  const { locale } = useTranslation()
  return locale
}

/**
 * Hook to get the text direction.
 *
 * @returns The text direction ('ltr' or 'rtl')
 */
export function useDirection(): 'ltr' | 'rtl' {
  const { direction } = useTranslation()
  return direction
}

/**
 * Translates an error at render time so the displayed message updates automatically
 * when the locale changes.
 *
 * **Always use this hook to display errors in React components** — accessing
 * `error.message` directly bypasses re-translation and leaves stale text after a
 * locale switch. If `error` is an `I18nError` (thrown via `throw new I18nError(key)`),
 * its key is translated using the current locale. For plain `Error` instances,
 * `error.message` is returned unchanged.
 *
 * @param error - The error to translate, or `null`/`undefined`.
 * @returns The translated error string, or `null` if no error.
 */
export function useI18nError(error: Error | null | undefined): string | null {
  const { t } = useTranslation()
  if (!error) return null
  // defaultValue is the I18nError's own message — the fallback text its throw
  // site provided (for a server error: the server's already-translated
  // message). Without it, a key the CLIENT dictionary happens to lack renders
  // as the raw key ("user.error.passwordTooShort") instead of a message.
  if (error instanceof I18nError) {
    return t(error.i18nKey, error.i18nValues, { defaultValue: error.message })
  }
  return error.message
}
