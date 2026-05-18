import type { SvelteTranslations } from './types.js'

/** Svelte translations for ca. */
export const ca: Partial<SvelteTranslations> = {
  'svelte.error.unknownPaginationDirection': 'Direcció de paginació desconeguda: "{{direction}}"',
  'svelte.error.noStateProvider': 'Proveïdor estatal no trobat en context',
  'svelte.error.noAuthClient': 'Client d&#39;autenticació no trobat en context',
  'svelte.error.noThemeProvider': 'Proveïdor de temes no trobat en context',
  'svelte.error.noRouter': 'No s&#39;ha trobat l&#39;encaminador en context',
  'svelte.error.noI18nProvider': 'Proveïdor I18n no trobat en context',
  'svelte.error.noHttpClient': 'Client HTTP no trobat en context',
  'svelte.error.noStorageProvider': 'Proveïdor d&#39;emmagatzematge no trobat en context',
  'svelte.error.noLoggerProvider': 'Proveïdor del registrador no trobat en context',
}
