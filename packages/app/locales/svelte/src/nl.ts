import type { SvelteTranslations } from './types.js'

/** Svelte translations for Dutch. */
export const nl: SvelteTranslations = {
  'svelte.error.noStateProvider': 'State-provider niet gevonden in context',
  'svelte.error.noAuthClient': 'Auth-client niet gevonden in context',
  'svelte.error.noThemeProvider': 'Thema-provider niet gevonden in context',
  'svelte.error.noRouter': 'Router niet gevonden in context',
  'svelte.error.noI18nProvider': 'I18n-provider niet gevonden in context',
  'svelte.error.noHttpClient': 'HTTP-client niet gevonden in context',
  'svelte.error.noStorageProvider': 'Opslag-provider niet gevonden in context',
  'svelte.error.noLoggerProvider': 'Logger-provider niet gevonden in context',
  'svelte.error.unknownPaginationDirection': 'Onbekende pagineerrichting: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider moet binnen een ChatProvider worden gebruikt',
  'svelte.error.useToastOutsideProvider': 'useToast moet binnen een ToastProvider worden gebruikt',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider moet binnen een WorkspaceProvider worden gebruikt.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider moet binnen een EditorProvider worden gebruikt',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider moet binnen een PreviewProvider worden gebruikt.',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient moet binnen een AuthProvider worden gebruikt.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider moet binnen een ThemeProvider worden gebruikt',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance moet binnen een RouterProvider worden gebruikt',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient moet binnen een HttpProvider worden gebruikt.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider moet binnen een StorageProvider worden gebruikt.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider moet binnen een LoggerProvider worden gebruikt',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider moet binnen een StateProvider worden gebruikt',
  'svelte.error.unsupportedMethod': 'Niet-ondersteunde methode: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-aanmelding mislukt',
}
