import type { SvelteTranslations } from './types.js'

/** Svelte translations for ca. */
export const ca: Partial<SvelteTranslations> = {
  'svelte.error.unknownPaginationDirection': 'Direcció de paginació desconeguda: "{{direction}}"',
  'svelte.error.noStateProvider': 'Proveïdor estatal no trobat en context',
  'svelte.error.noAuthClient': "Client d'autenticació no trobat en context",
  'svelte.error.noThemeProvider': 'Proveïdor de temes no trobat en context',
  'svelte.error.noRouter': "No s'ha trobat l'encaminador en context",
  'svelte.error.noI18nProvider': 'Proveïdor I18n no trobat en context',
  'svelte.error.noHttpClient': 'Client HTTP no trobat en context',
  'svelte.error.noStorageProvider': "Proveïdor d'emmagatzematge no trobat en context",
  'svelte.error.noLoggerProvider': 'Proveïdor del registrador no trobat en context',
  'svelte.error.useChatOutsideProvider': "useChatProvider s'ha d'utilitzar dins d'un ChatProvider.",
  'svelte.error.useToastOutsideProvider': "useToast s'ha d'utilitzar dins d'un ToastProvider.",
  'svelte.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider s'ha d'utilitzar dins d'un WorkspaceProvider.",
  'svelte.error.useEditorOutsideProvider':
    "useEditorProvider s'ha d'utilitzar dins d'un EditorProvider.",
  'svelte.error.usePreviewOutsideProvider':
    "usePreviewProvider s'ha d'utilitzar dins d'un PreviewProvider.",
  'svelte.error.useAuthOutsideProvider': "useAuthClient s'ha d'utilitzar dins d'un AuthProvider.",
  'svelte.error.useThemeOutsideProvider':
    "useThemeProvider s'ha d'utilitzar dins d'un ThemeProvider.",
  'svelte.error.useRouterOutsideProvider':
    "useRouterInstance s'ha d'utilitzar dins d'un RouterProvider.",
  'svelte.error.useHttpOutsideProvider': "useHttpClient s'ha d'utilitzar dins d'un HttpProvider.",
  'svelte.error.useStorageOutsideProvider':
    "useStorageProvider s'ha d'utilitzar dins d'un StorageProvider.",
  'svelte.error.useLoggerOutsideProvider':
    "useLoggerProvider s'ha d'utilitzar dins d'un LoggerProvider.",
  'svelte.error.useStoreOutsideProvider':
    "useStateProvider s'ha d'utilitzar dins d'un StateProvider.",
  'svelte.error.unsupportedMethod': 'Mètode no compatible: {{method}}',
  'svelte.error.oauthFailed': "L'inici de sessió amb OAuth ha fallat",
}
