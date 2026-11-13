import type { SvelteTranslations } from './types.js'

/** Svelte translations for Estonian. */
export const et: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Olekupakkujat ei leitud kontekstis',
  'svelte.error.noAuthClient': 'Autentimisklienti ei leitud kontekstis',
  'svelte.error.noThemeProvider': 'Teemapakkujat ei leitud kontekstis',
  'svelte.error.noRouter': 'Ruuterit ei leitud kontekstis',
  'svelte.error.noI18nProvider': 'I18n pakkujat ei leitud kontekstis',
  'svelte.error.noHttpClient': 'HTTP klienti ei leitud kontekstis',
  'svelte.error.noStorageProvider': 'Salvestuspakkujat ei leitud kontekstis',
  'svelte.error.noLoggerProvider': 'Logipakkujat ei leitud kontekstis',
  'svelte.error.unknownPaginationDirection': 'Tundmatu lehekülgede suund: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider tuleb kasutada ChatProvider sees',
  'svelte.error.useToastOutsideProvider': 'useToast tuleb kasutada ToastProvider sees',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider peab olema kasutusel WorkspaceProvideri sees.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider peab olema kasutatud EditorProvideri sees.',
  'svelte.error.usePreviewOutsideProvider':
    'EelvaatePakkuja sees tuleb kasutada usePreviewProviderit',
  'svelte.error.useAuthOutsideProvider': "AuthProvideri sees tuleb kasutada useAuthClient'i",
  'svelte.error.useThemeOutsideProvider': 'useThemeProviderit tuleb kasutada ThemeProvideri sees.',
  'svelte.error.useRouterOutsideProvider':
    "useRouterInstance'i tuleb kasutada RouterProvideri sees.",
  'svelte.error.useHttpOutsideProvider': 'useHttpClient peab olema kasutatud HttpProvideri sees.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider peab olema kasutusel StorageProvideri sees.',
  'svelte.error.useLoggerOutsideProvider':
    'LoggerProvideri sees tuleb kasutada useLoggerProviderit.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider peab olema kasutatud StateProvider sees.',
  'svelte.error.unsupportedMethod': 'Toetamata meetod: {{method}}',
  'svelte.error.oauthFailed': 'OAuthi sisselogimine ebaõnnestus',
}
