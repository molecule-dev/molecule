import type { SvelteTranslations } from './types.js'

/** Svelte translations for German. */
export const de: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Zustandsanbieter nicht im Kontext gefunden',
  'svelte.error.noAuthClient': 'Authentifizierungsclient nicht im Kontext gefunden',
  'svelte.error.noThemeProvider': 'Theme-Anbieter nicht im Kontext gefunden',
  'svelte.error.noRouter': 'Router nicht im Kontext gefunden',
  'svelte.error.noI18nProvider': 'I18n-Anbieter nicht im Kontext gefunden',
  'svelte.error.noHttpClient': 'HTTP-Client nicht im Kontext gefunden',
  'svelte.error.noStorageProvider': 'Speicheranbieter nicht im Kontext gefunden',
  'svelte.error.noLoggerProvider': 'Logger-Anbieter nicht im Kontext gefunden',
  'svelte.error.unknownPaginationDirection': 'Unbekannte Paginierungsrichtung: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider muss innerhalb eines ChatProvider verwendet werden',
  'svelte.error.useToastOutsideProvider':
    'useToast muss innerhalb eines ToastProvider verwendet werden',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider muss innerhalb eines WorkspaceProviders verwendet werden.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider muss innerhalb eines EditorProviders verwendet werden.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider muss innerhalb eines PreviewProvider verwendet werden.',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient muss innerhalb eines AuthProviders verwendet werden.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider muss innerhalb eines ThemeProviders verwendet werden.',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance muss innerhalb eines RouterProviders verwendet werden.',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient muss innerhalb eines HttpProviders verwendet werden.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider muss innerhalb eines StorageProviders verwendet werden.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider muss innerhalb eines LoggerProviders verwendet werden.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider muss innerhalb eines StateProviders verwendet werden.',
  'svelte.error.unsupportedMethod': 'Nicht unterstützte Methode: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-Anmeldung fehlgeschlagen',
}
