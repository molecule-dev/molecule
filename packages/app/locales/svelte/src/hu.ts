import type { SvelteTranslations } from './types.js'

/** Svelte translations for Hungarian. */
export const hu: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Állapotszolgáltató nem található a kontextusban',
  'svelte.error.noAuthClient': 'Hitelesítési kliens nem található a kontextusban',
  'svelte.error.noThemeProvider': 'Témaszolgáltató nem található a kontextusban',
  'svelte.error.noRouter': 'Útválasztó nem található a kontextusban',
  'svelte.error.noI18nProvider': 'I18n szolgáltató nem található a kontextusban',
  'svelte.error.noHttpClient': 'HTTP kliens nem található a kontextusban',
  'svelte.error.noStorageProvider': 'Tárolószolgáltató nem található a kontextusban',
  'svelte.error.noLoggerProvider': 'Naplózó szolgáltató nem található a kontextusban',
  'svelte.error.unknownPaginationDirection': 'Ismeretlen lapozási irány: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'A useChatProvider-t ChatProvider-en belül kell használni',
  'svelte.error.useToastOutsideProvider': 'A useToast-ot ToastProvider-en belül kell használni',
  'svelte.error.useWorkspaceOutsideProvider':
    'A useWorkspaceProvider paramétert egy WorkspaceProvider-en belül kell használni.',
  'svelte.error.useEditorOutsideProvider':
    'A useEditorProvider paramétert egy EditorProvider-en belül kell használni.',
  'svelte.error.usePreviewOutsideProvider':
    'A usePreviewProvider paramétert egy PreviewProvider-en belül kell használni.',
  'svelte.error.useAuthOutsideProvider':
    'A useAuthClient-et egy AuthProvider-en belül kell használni.',
  'svelte.error.useThemeOutsideProvider':
    'A useThemeProvider-t egy ThemeProvider-en belül kell használni.',
  'svelte.error.useRouterOutsideProvider':
    'A useRouterInstance függvényt egy RouterProvider-en belül kell használni.',
  'svelte.error.useHttpOutsideProvider':
    'A useHttpClient függvényt egy HttpProvider-en belül kell használni.',
  'svelte.error.useStorageOutsideProvider':
    'A useStorageProvider paramétert egy StorageProvider paraméteren belül kell használni.',
  'svelte.error.useLoggerOutsideProvider':
    'A useLoggerProvider paramétert egy LoggerProvider-en belül kell használni.',
  'svelte.error.useStoreOutsideProvider':
    'A useStateProvider paramétert egy StateProvider paraméteren belül kell használni.',
  'svelte.error.unsupportedMethod': 'Nem támogatott metódus: {{method}}',
  'svelte.error.oauthFailed': 'OAuth bejelentkezés sikertelen',
}
