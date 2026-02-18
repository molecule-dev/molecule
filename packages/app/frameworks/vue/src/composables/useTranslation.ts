/**
 * Vue composable for internationalization.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, ref } from 'vue'

import type { I18nProvider, InterpolationValues } from '@molecule/app-i18n'

import { I18nKey } from '../injection-keys.js'
import type { UseTranslationReturn } from '../types.js'

/**
 * Composable to access the i18n provider from injection.
 *
 * @returns The i18n provider
 * @throws {Error} Error if used without providing i18n
 */
export function useI18nProvider(): I18nProvider {
  const provider = inject(I18nKey)
  if (!provider) {
    throw new Error('useI18nProvider requires I18nProvider to be provided')
  }
  return provider
}

/**
 * Composable for internationalization.
 *
 * @returns Translation function and locale management
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTranslation } from '`@molecule/app-vue`'
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

  // Subscribe to locale changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = provider.onLocaleChange(() => {
      currentLocale.value = provider.getLocale()
      currentDirection.value = provider.getDirection()
      currentLocales.value = provider.getLocales()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  // Computed properties
  const locale = computed(() => currentLocale.value)
  const direction = computed(() => currentDirection.value)
  const locales = computed(() => currentLocales.value)

  // Translation function (reactive - will re-render on locale change)
  const t = (key: string, values?: InterpolationValues): string => provider.t(key, values)

  // Actions
  const setLocale: I18nProvider['setLocale'] = (locale) => provider.setLocale(locale)
  const formatNumber: I18nProvider['formatNumber'] = (value, options?) =>
    provider.formatNumber(value, options)
  const formatDate: I18nProvider['formatDate'] = (value, options?) =>
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
 * Composable to get just the translation function.
 *
 * @returns Translation function
 */
export function useT() {
  const provider = useI18nProvider()
  return (key: string, values?: InterpolationValues) => provider.t(key, values)
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
