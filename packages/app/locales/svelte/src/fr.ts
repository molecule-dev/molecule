import type { SvelteTranslations } from './types.js'

/** Svelte translations for fr. */
export const fr: Partial<SvelteTranslations> = {
  'svelte.error.noThemeProvider': 'Fournisseur de thème introuvable dans le contexte',
  'svelte.error.noRouter': 'Routeur introuvable dans le contexte',
  'svelte.error.noI18nProvider': 'Fournisseur i18n introuvable dans le contexte',
  'svelte.error.noHttpClient': 'Client HTTP introuvable dans le contexte',
  'svelte.error.noStorageProvider': 'Fournisseur de stockage introuvable dans le contexte',
  'svelte.error.noLoggerProvider': 'Fournisseur de journalisation introuvable dans le contexte',
  'svelte.error.unknownPaginationDirection': 'Direction de pagination inconnue : "{{direction}}"',
  'svelte.error.noStateProvider': "Fournisseur d'État introuvable dans le contexte",
  'svelte.error.noAuthClient': "Client d'authentification introuvable dans le contexte",
  'svelte.error.useChatOutsideProvider':
    "La fonction useChatProvider doit être utilisée au sein d'un ChatProvider.",
  'svelte.error.useToastOutsideProvider':
    "La méthode useToast doit être utilisée à l'intérieur d'un ToastProvider.",
}
