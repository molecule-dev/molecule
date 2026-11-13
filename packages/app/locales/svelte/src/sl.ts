import type { SvelteTranslations } from './types.js'

/** Svelte translations for Slovenian. */
export const sl: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Ponudnik stanja ni bil najden v kontekstu',
  'svelte.error.noAuthClient': 'Odjemalec za avtentikacijo ni bil najden v kontekstu',
  'svelte.error.noThemeProvider': 'Ponudnik teme ni bil najden v kontekstu',
  'svelte.error.noRouter': 'Usmerjevalnik ni bil najden v kontekstu',
  'svelte.error.noI18nProvider': 'I18n ponudnik ni bil najden v kontekstu',
  'svelte.error.noHttpClient': 'HTTP odjemalec ni bil najden v kontekstu',
  'svelte.error.noStorageProvider': 'Ponudnik shranjevanja ni bil najden v kontekstu',
  'svelte.error.noLoggerProvider': 'Ponudnik bele\u017eenja ni bil najden v kontekstu',
  'svelte.error.unknownPaginationDirection': 'Neznana smer ostra\u0161evanja: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider je treba uporabiti znotraj ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast je treba uporabiti znotraj ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora uporabljati znotraj WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider se mora uporabljati znotraj EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider se mora uporabljati znotraj PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient mora biti uporabljen znotraj AuthProviderja',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider se mora uporabljati znotraj ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance se mora uporabljati znotraj RouterProviderja',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient se mora uporabljati znotraj HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider se mora uporabljati znotraj StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider se mora uporabljati znotraj LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider se mora uporabljati znotraj StateProvider',
  'svelte.error.unsupportedMethod': 'Nepodprta metoda: {{method}}',
  'svelte.error.oauthFailed': 'Prijava OAuth ni uspela',
}
