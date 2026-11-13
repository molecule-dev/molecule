import type { SvelteTranslations } from './types.js'

/** Svelte translations for Polish. */
export const pl: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Dostawca stanu nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noAuthClient':
    'Klient uwierzytelniania nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noThemeProvider': 'Dostawca motywu nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noRouter': 'Router nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noI18nProvider': 'Dostawca i18n nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noHttpClient': 'Klient HTTP nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noStorageProvider':
    'Dostawca pami\u0119ci nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.noLoggerProvider': 'Dostawca loggera nie zosta\u0142 znaleziony w kontek\u015bcie',
  'svelte.error.unknownPaginationDirection': 'Nieznany kierunek paginacji: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider musi być używany wewnątrz ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast musi być używany wewnątrz ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musi być używany w WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider musi być używany w ramach EditorProvider',
  'svelte.error.usePreviewOutsideProvider': 'usePreviewProvider musi być używany w PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient musi być używany w ramach AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider musi być używany w ramach ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance musi być używany w ramach RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient musi być używany w ramach HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider musi być używany w ramach StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider musi być używany w LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider musi być używany w obrębie StateProvider',
  'svelte.error.unsupportedMethod': 'Nieobsługiwana metoda: {{method}}',
  'svelte.error.oauthFailed': 'Nieudane logowanie OAuth',
}
