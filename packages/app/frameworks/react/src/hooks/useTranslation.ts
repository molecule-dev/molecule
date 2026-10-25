/**
 * React hook for internationalization.
 *
 * @module
 */

import { useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from 'react'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
  TranslateOptions,
} from '@molecule/app-i18n'
import { I18nError, t } from '@molecule/app-i18n'

import { I18nContext } from '../contexts.js'
import type { UseTFunction, UseTranslationResult } from '../types.js'

/**
 * Hook to access the i18n provider from context.
 *
 * @returns The i18n provider from context
 * @throws {Error} Error if used outside of I18nProvider
 */
export function useI18nProvider(): I18nProvider {
  const provider = useContext(I18nContext)
  if (!provider) {
    throw new Error(
      t('react.error.useI18nOutsideProvider', undefined, {
        defaultValue: 'useI18nProvider must be used within an I18nProvider',
      }),
    )
  }
  return provider
}

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
 * No hook-returned function is rebuilt, so an effect that depends on one stays
 * stable.
 *
 * @param provider - The i18n provider from context.
 * @returns A value that changes on every notification, revision and locale switch.
 */
function useLocaleSnapshot(provider: I18nProvider): string {
  const store = useMemo(() => {
    let notifications = 0
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
      getSnapshot: (): string =>
        `${notifications}:${provider.getRevision?.() ?? 0}:${provider.getLocale()}`,
    }
  }, [provider])
  useLayoutEffect(() => provider.onLocaleChange(store.listener), [provider, store])
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
  const snapshot = useLocaleSnapshot(provider)

  // Read from the provider on every render, never copied into state: a
  // replaced provider, or a switch that landed before the subscription, shows
  // its own values on the first render instead of the previous ones.
  const locale = provider.getLocale()
  const direction = provider.getDirection()
  // `snapshot` is the recompute key: a new list once per notification, the same
  // list otherwise, so an effect that depends on `locales` stays stable.
  const locales = useMemo(() => provider.getLocales(), [provider, snapshot])

  // Memoized translation function
  const t: I18nProvider['t'] = useCallback(
    (
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number },
    ) => provider.t(key, values, options),
    [provider, locale],
  )

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
