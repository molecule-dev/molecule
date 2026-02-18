/** Translation keys for the svelte locale package. */
export type SvelteTranslationKey =
  | 'svelte.error.noStateProvider'
  | 'svelte.error.noAuthClient'
  | 'svelte.error.noThemeProvider'
  | 'svelte.error.noRouter'
  | 'svelte.error.noI18nProvider'
  | 'svelte.error.noHttpClient'
  | 'svelte.error.noStorageProvider'
  | 'svelte.error.noLoggerProvider'
  | 'svelte.error.unknownPaginationDirection'

/** Translation record mapping svelte keys to translated strings. */
export type SvelteTranslations = Record<SvelteTranslationKey, string>
