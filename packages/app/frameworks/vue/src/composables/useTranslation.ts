/**
 * Vue composable for internationalization.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, type Ref, ref } from 'vue'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
  TranslateOptions,
} from '@molecule/app-i18n'
import { getProvider, I18nError } from '@molecule/app-i18n'

import { I18nKey } from '../injection-keys.js'
import type { UseTranslationReturn } from '../types.js'

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

  onMounted(() => {
    unsubscribe = provider.onLocaleChange(() => {
      version.value++
    })
    // A locale change between setup and mount sends no notification this
    // subscription could see — reconcile it now.
    version.value++
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
export function useTranslation(): UseTranslationReturn {
  const provider = useI18nProvider()

  // Reactive state
  const currentLocale = ref<string>(provider.getLocale())
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

  onMounted(() => {
    const refresh = (): void => {
      version.value++
      currentLocale.value = provider.getLocale()
      currentDirection.value = provider.getDirection()
      currentLocales.value = provider.getLocales()
    }
    unsubscribe = provider.onLocaleChange(refresh)
    // A locale change between setup and mount sends no notification this
    // subscription could see — reconcile it now.
    refresh()
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
  const t = (
    key: string,
    values?: InterpolationValues,
    options?: { defaultValue?: string; count?: number },
  ): string => {
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
 * The translation function {@link useT} returns: the provider signature plus
 * the `t(key, fallback, options?)` shorthand whose string second argument is
 * the `defaultValue`.
 */
export type UseTFunction = (
  key: string,
  valuesOrDefault?: InterpolationValues | string,
  options?: TranslateOptions,
) => string

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
  return (key, valuesOrDefault, options) => {
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
 * @param error - The error to translate, or `null`/`undefined`.
 * @returns Computed reference to the translated error string, or `null` if no error.
 */
export function useI18nError(error: Error | null | undefined): ComputedRef<string | null> {
  const { t, locale } = useTranslation()
  return computed(() => {
    void locale.value
    if (!error) return null
    // defaultValue is the I18nError's own message — the fallback text its
    // throw site provided (for a server error: the server's
    // already-translated message). Without it, a key the CLIENT dictionary
    // happens to lack renders as the raw key instead of a message.
    if (error instanceof I18nError) {
      return t(error.i18nKey, error.i18nValues, { defaultValue: error.message })
    }
    return error.message
  })
}
