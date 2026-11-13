import type { SvelteTranslations } from './types.js'

/** Svelte translations for Croatian. */
export const hr: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Pružatelj stanja nije pronađen u kontekstu',
  'svelte.error.noAuthClient': 'Klijent za autentifikaciju nije pronađen u kontekstu',
  'svelte.error.noThemeProvider': 'Pružatelj teme nije pronađen u kontekstu',
  'svelte.error.noRouter': 'Usmjerivač nije pronađen u kontekstu',
  'svelte.error.noI18nProvider': 'I18n pružatelj nije pronađen u kontekstu',
  'svelte.error.noHttpClient': 'HTTP klijent nije pronađen u kontekstu',
  'svelte.error.noStorageProvider': 'Pružatelj pohrane nije pronađen u kontekstu',
  'svelte.error.noLoggerProvider': 'Pružatelj zapisnika nije pronađen u kontekstu',
  'svelte.error.unknownPaginationDirection': 'Nepoznat smjer paginacije: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider se mora koristiti unutar ChatProvider-a',
  'svelte.error.useToastOutsideProvider': 'useToast se mora koristiti unutar ToastProvider-a',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora koristiti unutar WorkspaceProvider-a',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider se mora koristiti unutar EditorProvider-a',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider se mora koristiti unutar PreviewProvider-a',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient se mora koristiti unutar AuthProvider-a',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider se mora koristiti unutar ThemeProvider-a',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance se mora koristiti unutar RouterProvidera',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient se mora koristiti unutar HttpProvidera',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider se mora koristiti unutar StorageProvider-a',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider se mora koristiti unutar LoggerProvidera',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider se mora koristiti unutar StateProvider-a',
  'svelte.error.unsupportedMethod': 'Nepodržana metoda: {{method}}',
  'svelte.error.oauthFailed': 'Prijava putem OAuth-a nije uspjela',
}
