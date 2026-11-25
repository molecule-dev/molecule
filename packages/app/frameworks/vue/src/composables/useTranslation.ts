/**
 * Vue composable for internationalization.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  inject,
  type MaybeRefOrGetter,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
  toValue,
} from 'vue'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
  RichTranslateFunction,
  TranslateOptions,
} from '@molecule/app-i18n'
import { createRichTranslator, getProvider, I18nError } from '@molecule/app-i18n'

import { I18nKey } from '../injection-keys.js'
import type { UseTranslationResult } from '../types.js'

/**
 * Reads rich catalog messages from the active provider. Call the returned
 * translation function in render so it follows locale and catalog changes.
 *
 * @returns The locale-reactive rich translation function.
 */
export function useRichTranslation(): RichTranslateFunction {
  return createRichTranslator(useT())
}

/**
 * Composable to access the i18n provider: the one the nearest provider supplies,
 * otherwise the bonded `@molecule/app-i18n` provider, which is the one the
 * static `t` reads. A component can therefore translate through
 * {@link useTranslation} wherever the static `t` works, and it re-renders when
 * the locale changes.
 *
 * @returns The i18n provider from injection, or the bonded provider.
 */
export function useI18nProvider(): I18nProvider {
  return inject(I18nKey, null) ?? getProvider()
}

/**
 * Subscribes the calling component to the provider's locale notifications.
 *
 * The version counter increments on every notification (including translation
 * additions for the current locale); reading it inside a computed establishes
 * a Vue reactive dependency, so the template re-renders when translations
 * change.
 *
 * @param provider - The i18n provider from injection.
 * @returns A ref that changes on every locale notification.
 */
function useLocaleVersion(provider: I18nProvider): Ref<number> {
  const version = ref(0)

  let unsubscribe: (() => void) | null = null

  // What the provider said when this composable was created. A change between
  // setup and mount sends no notification a subscription attached at mount
  // could see, so mount reconciles only when one of these moved — a quiet mount
  // renders once, like the React hook's snapshot re-read after subscribing.
  const seenRevision = provider.getRevision?.()
  const seenLocale = provider.getLocale()

  onMounted(() => {
    unsubscribe = provider.onLocaleChange(() => {
      version.value++
    })
    if (provider.getRevision?.() !== seenRevision || provider.getLocale() !== seenLocale) {
      version.value++
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return version
}

/**
 * Composable for internationalization.
 *
 * @returns Translation function and locale management
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTranslation } from '@molecule/app-vue'
 *
 * const { t, locale, setLocale, formatNumber } = useTranslation()
 * </script>
 *
 * <template>
 *   <div>
 *     <h1>{{ t('welcome.title', { name: 'User' }) }}</h1>
 *     <p>{{ formatNumber(1234.56, { style: 'currency', currency: 'USD' }) }}</p>
 *     <select :value="locale" @change="setLocale($event.target.value)">
 *       <option value="en">English</option>
 *       <option value="es">Spanish</option>
 *     </select>
 *   </div>
 * </template>
 * ```
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()

  // Reactive state
  const initialLocale = provider.getLocale()
  const currentLocale = ref<string>(initialLocale)
  const currentDirection = ref<'ltr' | 'rtl'>(provider.getDirection())
  const currentLocales = ref(provider.getLocales())

  // Version counter incremented on every notification (including translation
  // additions for the current locale). Reading it inside the computeds below
  // establishes a Vue reactive dependency, so `t` re-renders a template that
  // reads it when translations change.
  const version = ref(0)
  let lastVersion = -1

  // Subscribe to locale changes
  let unsubscribe: (() => void) | null = null

  // What the provider said when this composable was created: a change between
  // setup and mount sends no notification a subscription attached at mount
  // could see, so mount reconciles only when one of these moved — a quiet mount
  // renders once, like the React hook's snapshot re-read after subscribing.
  const seenRevision = provider.getRevision?.()

  onMounted(() => {
    const refresh = (): void => {
      version.value++
      currentLocale.value = provider.getLocale()
      currentDirection.value = provider.getDirection()
      currentLocales.value = provider.getLocales()
    }
    unsubscribe = provider.onLocaleChange(refresh)
    if (provider.getRevision?.() !== seenRevision || provider.getLocale() !== initialLocale) {
      refresh()
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  // Computed properties
  const locale = computed(() => {
    void version.value
    return currentLocale.value
  })
  const direction = computed(() => {
    void version.value
    return currentDirection.value
  })
  // A new list once per notification, the same list otherwise, so a watcher
  // depending on `locales` stays stable between notifications.
  const locales = computed(() => {
    if (version.value !== lastVersion) {
      lastVersion = version.value
      currentLocales.value = provider.getLocales()
    }
    return currentLocales.value
  })

  // Translation function (reactive — re-renders on locale or translation
  // change; reads the provider on every call so a replaced provider's own
  // values show immediately).
  const t = (key: string, values?: InterpolationValues, options?: TranslateOptions): string => {
    void version.value
    return provider.t(key, values, options)
  }

  // Actions
  const setLocale: I18nProvider['setLocale'] = (next) => provider.setLocale(next)
  const formatNumber = (value: number, options?: NumberFormatOptions): string =>
    provider.formatNumber(value, options)
  const formatDate = (value: Date | number | string, options?: DateFormatOptions): string =>
    provider.formatDate(value, options)

  return {
    t,
    locale,
    direction,
    locales,
    setLocale,
    formatNumber,
    formatDate,
  }
}

/**
 * Options for the shorthand form of {@link UseTFunction}: the fallback text is
 * passed positionally, so only `count` remains here.
 */
export type UseTShorthandOptions = Omit<TranslateOptions, 'defaultValue'>

/**
 * The translation function {@link useT} returns.
 *
 * Two compatible call forms:
 * - `t(key, values?, options?)` — the {@link I18nProvider.t} signature.
 * - `t(key, fallback, options?)` — a string second argument is the inline
 *   English `defaultValue`, with optional `count` for pluralization.
 */
export type UseTFunction = I18nProvider['t'] & {
  (key: string, fallback: string, options?: UseTShorthandOptions): string
}

/**
 * Composable to get just the translation function.
 *
 * The returned function keeps ONE identity for as long as the provider
 * instance is unchanged, so it is safe as a watcher dependency. It still
 * re-renders the calling component on every locale notification (including
 * `addTranslations` for the active locale): text it reads while rendering is
 * current, while a value memoized on the function alone keeps the old text
 * after a locale switch.
 *
 * Call it in either of two compatible forms:
 *
 * - `t(key, values?, options?)` — the provider signature from
 *   `@molecule/app-i18n`, e.g. `t('cart.total', { total })`.
 * - `t(key, fallback, options?)` — a shorthand for the common inline-English
 *   call: a string second argument is the `defaultValue`, so
 *   `t('cart.empty', 'Your cart is empty')` equals
 *   `t('cart.empty', undefined, { defaultValue: 'Your cart is empty' })`.
 *
 * @returns The translation function (stable identity while the provider is unchanged)
 */
export function useT(): UseTFunction {
  const provider = useI18nProvider()
  const version = useLocaleVersion(provider)
  return (
    key: string,
    valuesOrDefault?: InterpolationValues | string,
    options?: TranslateOptions,
  ): string => {
    // Reading the counter makes the calling template's render depend on locale
    // notifications, so text it prints updates after a locale switch.
    void version.value
    return typeof valuesOrDefault === 'string'
      ? provider.t(key, undefined, { ...options, defaultValue: valuesOrDefault })
      : provider.t(key, valuesOrDefault, options)
  }
}

/**
 * Composable to get the current locale.
 *
 * @returns Computed locale reference
 */
export function useLocale(): ComputedRef<string> {
  const { locale } = useTranslation()
  return locale
}

/**
 * Composable to get the text direction.
 *
 * @returns Computed direction reference
 */
export function useDirection(): ComputedRef<'ltr' | 'rtl'> {
  const { direction } = useTranslation()
  return direction
}

/**
 * Translates an error at render time so the displayed message updates
 * automatically when the locale changes.
 *
 * **Always use this composable to display errors in components** — accessing
 * `error.message` directly bypasses re-translation and leaves stale text after
 * a locale switch. If `error` is an `I18nError` (thrown via
 * `throw new I18nError(key)`), its key is translated using the current locale.
 * For plain `Error` instances, `error.message` is returned unchanged.
 *
 * The error may be reactive (a ref or a getter): a changed error replaces the
 * message on the same component, the way React re-renders `useI18nError`.
 *
 * @param error - The error to translate, or `null`/`undefined`; may be
 *   reactive, and a change replaces the message.
 * @returns Computed reference to the translated error string, or `null` if no error.
 */
export function useI18nError(
  error: MaybeRefOrGetter<Error | null | undefined>,
): ComputedRef<string | null> {
  const { t, locale } = useTranslation()
  return computed(() => {
    void locale.value
    const current = toValue(error)
    if (!current) return null
    // defaultValue is the I18nError's own message — the fallback text its
    // throw site provided (for a server error: the server's
    // already-translated message). Without it, a key the CLIENT dictionary
    // happens to lack renders as the raw key instead of a message.
    if (current instanceof I18nError) {
      return t(current.i18nKey, current.i18nValues, { defaultValue: current.message })
    }
    return current.message
  })
}
