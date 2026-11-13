/**
 * Internal i18n composable mirroring `@molecule/app-react`'s
 * `useTranslation` semantics: text re-renders on every locale notification
 * and the returned `t` always reads through the provider.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, ref } from 'vue'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  TranslateOptions,
} from '@molecule/app-i18n'
import { I18nKey } from '@molecule/app-vue'

/**
 * Accesses the i18n provider from injection.
 *
 * @returns The i18n provider.
 * @throws {Error} When no i18n provider was installed.
 */
export function useI18nProvider(): I18nProvider {
  const provider = inject(I18nKey)
  if (!provider) {
    throw new Error('useTranslation must be used within an i18n provider')
  }
  return provider
}

/** What {@link useTranslation} returns. */
export interface UseTranslationResult {
  /** Translates through the provider; re-renders on locale change. */
  t: (key: string, values?: InterpolationValues, options?: TranslateOptions) => string
  /** The active locale. */
  locale: ComputedRef<string>
  /** Switches the active locale. */
  setLocale: (code: string) => void
  /** The available locales, re-read on locale change. */
  locales: ComputedRef<LocaleConfig[]>
  /** Formats a number through the provider. */
  formatNumber: (value: number, options?: NumberFormatOptions) => string
  /** Formats a date through the provider. */
  formatDate: (value: Date | number | string, options?: DateFormatOptions) => string
  /** The text direction. */
  direction: ComputedRef<'ltr' | 'rtl'>
}

/**
 * Translation state and actions with React's `useTranslation` semantics.
 *
 * @returns Translation function and locale management.
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()

  const locale = ref<string>(provider.getLocale())
  let unsubscribe: (() => void) | null = null
  onMounted(() => {
    unsubscribe = provider.onLocaleChange(() => {
      locale.value = provider.getLocale()
    })
  })
  onUnmounted(() => {
    unsubscribe?.()
  })

  const t: UseTranslationResult['t'] = (key, values, options) => provider.t(key, values, options)

  return {
    t,
    locale: computed(() => locale.value),
    setLocale: (code: string) => {
      provider.setLocale(code)
    },
    // Recomputed whenever the locale notification fires, like React's
    // useMemo on the locale snapshot.
    locales: computed(() => {
      void locale.value
      return provider.getLocales()
    }),
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      provider.formatNumber(value, options),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
    direction: computed(() => {
      void locale.value
      return provider.getDirection()
    }),
  }
}
