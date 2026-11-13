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
  'svelte.error.useWorkspaceOutsideProvider':
    "La fonction useWorkspaceProvider doit être utilisée à l'intérieur d'un WorkspaceProvider.",
  'svelte.error.useEditorOutsideProvider':
    "La méthode useEditorProvider doit être utilisée à l'intérieur d'un EditorProvider.",
  'svelte.error.usePreviewOutsideProvider':
    "La méthode usePreviewProvider doit être utilisée à l'intérieur d'un PreviewProvider.",
  'svelte.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'svelte.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
  'svelte.error.useRouterOutsideProvider':
    "La méthode useRouterInstance doit être utilisée au sein d'un RouterProvider.",
  'svelte.error.useHttpOutsideProvider':
    "La méthode useHttpClient doit être utilisée au sein d'un HttpProvider.",
  'svelte.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'svelte.error.useLoggerOutsideProvider':
    "La méthode useLoggerProvider doit être utilisée à l'intérieur d'un LoggerProvider.",
  'svelte.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",
  'svelte.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'svelte.error.oauthFailed': 'Échec de la connexion OAuth',
}
