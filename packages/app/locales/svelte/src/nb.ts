import type { SvelteTranslations } from './types.js'

/** Svelte translations for Norwegian Bokmål. */
export const nb: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Tilstandsleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noAuthClient': 'Autentiseringsklient ikke funnet i kontekst',
  'svelte.error.noThemeProvider': 'Temaleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noRouter': 'Ruter ikke funnet i kontekst',
  'svelte.error.noI18nProvider': 'I18n-leverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noHttpClient': 'HTTP-klient ikke funnet i kontekst',
  'svelte.error.noStorageProvider': 'Lagringsleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noLoggerProvider': 'Loggleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.unknownPaginationDirection': 'Ukjent pagineringsretning: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider må brukes innenfor en ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast må brukes innenfor en ToastProvider',
}
