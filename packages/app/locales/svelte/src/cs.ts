import type { SvelteTranslations } from './types.js'

/** Svelte translations for Czech. */
export const cs: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Poskytovatel stavu nebyl nalezen v kontextu',
  'svelte.error.noAuthClient': 'Autentizační klient nebyl nalezen v kontextu',
  'svelte.error.noThemeProvider': 'Poskytovatel motivu nebyl nalezen v kontextu',
  'svelte.error.noRouter': 'Router nebyl nalezen v kontextu',
  'svelte.error.noI18nProvider': 'Poskytovatel i18n nebyl nalezen v kontextu',
  'svelte.error.noHttpClient': 'HTTP klient nebyl nalezen v kontextu',
  'svelte.error.noStorageProvider': 'Poskytovatel úložiště nebyl nalezen v kontextu',
  'svelte.error.noLoggerProvider': 'Poskytovatel loggeru nebyl nalezen v kontextu',
  'svelte.error.unknownPaginationDirection': 'Neznámý směr stránkování: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider musí být použit uvnitř ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast musí být použit uvnitř ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musí být použit v rámci WorkspaceProvider.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider musí být použit v rámci EditorProvider.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider musí být použit v rámci PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient musí být použit v rámci AuthProvider.',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider musí být použit v rámci ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance musí být použita v rámci RouterProvider.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient musí být použit v rámci HttpProvider.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider musí být použit v rámci StorageProvider.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider musí být použit v rámci LoggerProvider.',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider musí být použit v rámci StateProvider.',
  'svelte.error.unsupportedMethod': 'Nepodporovaná metoda: {{method}}',
  'svelte.error.oauthFailed': 'Přihlášení přes OAuth se nezdařilo',
}
