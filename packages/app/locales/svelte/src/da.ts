import type { SvelteTranslations } from './types.js'

/** Svelte translations for Danish. */
export const da: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Tilstandsudbyder ikke fundet i kontekst',
  'svelte.error.noAuthClient': 'Godkendelsesklient ikke fundet i kontekst',
  'svelte.error.noThemeProvider': 'Temaudbyder ikke fundet i kontekst',
  'svelte.error.noRouter': 'Router ikke fundet i kontekst',
  'svelte.error.noI18nProvider': 'I18n-udbyder ikke fundet i kontekst',
  'svelte.error.noHttpClient': 'HTTP-klient ikke fundet i kontekst',
  'svelte.error.noStorageProvider': 'Lagerudbyder ikke fundet i kontekst',
  'svelte.error.noLoggerProvider': 'Logudbyder ikke fundet i kontekst',
  'svelte.error.unknownPaginationDirection': 'Ukendt pagineringsretning: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider skal bruges inden for en ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast skal bruges inden for en ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider skal bruges inden for en WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider skal bruges i en EditorProvider',
  'svelte.error.usePreviewOutsideProvider': 'usePreviewProvider skal bruges i en PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient skal bruges inden for en AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider skal bruges inden for en ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'useRouterInstance skal bruges i en RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient skal bruges i en HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider skal bruges inden for en StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider skal bruges inden for en LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider skal bruges inden for en StateProvider',
  'svelte.error.unsupportedMethod': 'Ikke-understøttet metode: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-login mislykkedes',
}
