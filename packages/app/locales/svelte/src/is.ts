import type { SvelteTranslations } from './types.js'

/** Svelte translations for Icelandic. */
export const is: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Stilveitandi fannst ekki \u00ed samhengi',
  'svelte.error.noAuthClient': 'Au\u00f0kenningarbi\u00f0lari fannst ekki \u00ed samhengi',
  'svelte.error.noThemeProvider': '\u00deemuveita fannst ekki \u00ed samhengi',
  'svelte.error.noRouter': 'Beinir fannst ekki \u00ed samhengi',
  'svelte.error.noI18nProvider': 'I18n veita fannst ekki \u00ed samhengi',
  'svelte.error.noHttpClient': 'HTTP bi\u00f0lari fannst ekki \u00ed samhengi',
  'svelte.error.noStorageProvider': 'Geymsluveita fannst ekki \u00ed samhengi',
  'svelte.error.noLoggerProvider': 'Skr\u00e1ningarveita fannst ekki \u00ed samhengi',
  'svelte.error.unknownPaginationDirection':
    '\u00d3\u00feekkt s\u00ed\u00f0u\u00e1tt: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider verður að nota innan ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast verður að nota innan ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider verður að vera notaður innan WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider verður að vera notað innan EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider verður að vera notað innan PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient verður að nota innan AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider verður að vera notað innan ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'useRouterInstance verður að nota innan RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient verður að vera notað innan HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider verður að vera notað innan StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider verður að vera notað innan LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider verður að vera notaður innan StateProvider',
  'svelte.error.unsupportedMethod': 'Óstudd aðferð: {{method}}',
  'svelte.error.oauthFailed': 'OAuth innskráning mistókst',
}
