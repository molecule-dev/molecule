import type { SvelteTranslations } from './types.js'

/** Svelte translations for Finnish. */
export const fi: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Tilapalveluntarjoajaa ei löytynyt kontekstista',
  'svelte.error.noAuthClient': 'Todennusasiakasta ei löytynyt kontekstista',
  'svelte.error.noThemeProvider': 'Teemapalveluntarjoajaa ei löytynyt kontekstista',
  'svelte.error.noRouter': 'Reititintä ei löytynyt kontekstista',
  'svelte.error.noI18nProvider': 'I18n-palveluntarjoajaa ei löytynyt kontekstista',
  'svelte.error.noHttpClient': 'HTTP-asiakasta ei löytynyt kontekstista',
  'svelte.error.noStorageProvider': 'Tallennuspalveluntarjoajaa ei löytynyt kontekstista',
  'svelte.error.noLoggerProvider': 'Lokipalveluntarjoajaa ei löytynyt kontekstista',
  'svelte.error.unknownPaginationDirection': 'Tuntematon sivutussuunta: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider on käytettävä ChatProvider-komponentin sisällä',
  'svelte.error.useToastOutsideProvider':
    'useToast on käytettävä ToastProvider-komponentin sisällä',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider-arvoa on käytettävä WorkspaceProvider-arvoa noudattaen.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider-muuttujaa on käytettävä EditorProvider-muuttujassa.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider-parametria on käytettävä PreviewProvider-parametrin sisällä.',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient-ominaisuutta on käytettävä AuthProvider-ominaisuuden sisällä.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider-muuttujaa on käytettävä ThemeProvider-muuttujassa.',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance-ominaisuutta on käytettävä RouterProvider-kohteen sisällä.',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient-ominaisuutta on käytettävä HttpProvider-palvelun sisällä.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider-parametria on käytettävä StorageProvider-parametrin sisällä.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider-parametria on käytettävä LoggerProvider-parametrin sisällä.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider-arvoa on käytettävä StateProvider-arvoa käyttävänä arvona.',
  'svelte.error.unsupportedMethod': 'Ei-tuettu menetelmä: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-kirjautuminen epäonnistui',
}
