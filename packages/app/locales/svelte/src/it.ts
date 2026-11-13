import type { SvelteTranslations } from './types.js'

/** Svelte translations for Italian. */
export const it: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Provider di stato non trovato nel contesto',
  'svelte.error.noAuthClient': 'Client di autenticazione non trovato nel contesto',
  'svelte.error.noThemeProvider': 'Provider del tema non trovato nel contesto',
  'svelte.error.noRouter': 'Router non trovato nel contesto',
  'svelte.error.noI18nProvider': 'Provider i18n non trovato nel contesto',
  'svelte.error.noHttpClient': 'Client HTTP non trovato nel contesto',
  'svelte.error.noStorageProvider': 'Provider di archiviazione non trovato nel contesto',
  'svelte.error.noLoggerProvider': 'Provider di logging non trovato nel contesto',
  'svelte.error.unknownPaginationDirection':
    'Direzione di paginazione sconosciuta: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    "useChatProvider deve essere utilizzato all'interno di un ChatProvider",
  'svelte.error.useToastOutsideProvider':
    "useToast deve essere utilizzato all'interno di un ToastProvider",
  'svelte.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider deve essere utilizzato all'interno di un WorkspaceProvider",
  'svelte.error.useEditorOutsideProvider':
    "useEditorProvider deve essere utilizzato all'interno di un EditorProvider",
  'svelte.error.usePreviewOutsideProvider':
    "usePreviewProvider deve essere utilizzato all'interno di un PreviewProvider",
  'svelte.error.useAuthOutsideProvider':
    "useAuthClient deve essere utilizzato all'interno di un AuthProvider",
  'svelte.error.useThemeOutsideProvider':
    "useThemeProvider deve essere utilizzato all'interno di un ThemeProvider",
  'svelte.error.useRouterOutsideProvider':
    "useRouterInstance deve essere utilizzato all'interno di un RouterProvider",
  'svelte.error.useHttpOutsideProvider':
    "useHttpClient deve essere utilizzato all'interno di un HttpProvider",
  'svelte.error.useStorageOutsideProvider':
    "useStorageProvider deve essere utilizzato all'interno di uno StorageProvider",
  'svelte.error.useLoggerOutsideProvider':
    "useLoggerProvider deve essere utilizzato all'interno di un LoggerProvider",
  'svelte.error.useStoreOutsideProvider':
    "useStateProvider deve essere utilizzato all'interno di uno StateProvider",
  'svelte.error.unsupportedMethod': 'Metodo non supportato: {{method}}',
  'svelte.error.oauthFailed': 'Accesso OAuth non riuscito',
}
