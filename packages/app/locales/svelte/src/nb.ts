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
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider må brukes innenfor en WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider må brukes i en EditorProvider',
  'svelte.error.usePreviewOutsideProvider': 'usePreviewProvider må brukes i en PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient må brukes i en AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider må brukes i en ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'useRouterInstance må brukes i en RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient må brukes i en HttpProvider',
  'svelte.error.useStorageOutsideProvider': 'useStorageProvider må brukes i en StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider må brukes i en LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider må brukes i en StateProvider',
  'svelte.error.unsupportedMethod': 'Metode som ikke støttes: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-pålogging mislyktes',
}
