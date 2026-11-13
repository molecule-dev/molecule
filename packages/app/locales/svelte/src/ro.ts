import type { SvelteTranslations } from './types.js'

/** Svelte translations for Romanian. */
export const ro: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Furnizorul de stare nu a fost g\u0103sit \u00een context',
  'svelte.error.noAuthClient': 'Clientul de autentificare nu a fost g\u0103sit \u00een context',
  'svelte.error.noThemeProvider': 'Furnizorul de tem\u0103 nu a fost g\u0103sit \u00een context',
  'svelte.error.noRouter': 'Routerul nu a fost g\u0103sit \u00een context',
  'svelte.error.noI18nProvider': 'Furnizorul i18n nu a fost g\u0103sit \u00een context',
  'svelte.error.noHttpClient': 'Clientul HTTP nu a fost g\u0103sit \u00een context',
  'svelte.error.noStorageProvider': 'Furnizorul de stocare nu a fost g\u0103sit \u00een context',
  'svelte.error.noLoggerProvider':
    'Furnizorul de \u00eenregistr\u0103ri nu a fost g\u0103sit \u00een context',
  'svelte.error.unknownPaginationDirection':
    'Direc\u021bie de paginare necunoscut\u0103: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider trebuie utilizat în interiorul unui ChatProvider',
  'svelte.error.useToastOutsideProvider':
    'useToast trebuie utilizat în interiorul unui ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider trebuie utilizat în cadrul unui WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider trebuie utilizat în cadrul unui EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider trebuie utilizat în cadrul unui PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient trebuie utilizat în cadrul unui AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider trebuie utilizat în cadrul unui ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance trebuie utilizată în cadrul unui RouterProvider',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient trebuie utilizat în cadrul unui HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider trebuie utilizat în cadrul unui StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider trebuie utilizat în cadrul unui LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider trebuie utilizat în cadrul unui StateProvider',
  'svelte.error.unsupportedMethod': 'Metodă neacceptată: {{method}}',
  'svelte.error.oauthFailed': 'Conectarea OAuth a eșuat',
}
