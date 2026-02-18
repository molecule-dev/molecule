/**
 * react-i18next provider implementation.
 *
 * Thin wrapper around the base i18next provider that adds the
 * react-i18next plugin and React-specific configuration.
 *
 * @module
 */

import { initReactI18next } from 'react-i18next'

import { createI18nextProvider } from '@molecule/app-i18n-i18next'

import type { ReactI18nextProviderConfig } from './types.js'

/**
 * Creates a React-specific i18n provider that wraps the base i18next provider with the
 * `react-i18next` plugin. Enables `useSuspense` by default for React Suspense integration.
 * @param config - Same as `I18nextProviderConfig` plus optional React-specific overrides.
 * @returns An `I18nProvider` with the `react-i18next` plugin pre-registered.
 */
export const createReactI18nextProvider = (
  config: ReactI18nextProviderConfig = {},
): ReturnType<typeof createI18nextProvider> => {
  return createI18nextProvider({
    ...config,
    plugins: [initReactI18next, ...(config.plugins ?? [])],
    i18nextOptions: {
      react: {
        useSuspense: true,
      },
      ...config.i18nextOptions,
    },
  })
}

/**
 * Default provider instance.
 */
export const provider = createReactI18nextProvider()
