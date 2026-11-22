import type { SvelteTranslations } from './types.js'

/** Svelte translations for Filipino. */
export const fil: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Hindi nahanap ang state provider sa konteksto',
  'svelte.error.noAuthClient': 'Hindi nahanap ang auth client sa konteksto',
  'svelte.error.noThemeProvider': 'Hindi nahanap ang theme provider sa konteksto',
  'svelte.error.noRouter':
    'Walang router dito. I-mount ang `MoleculeRouterProvider` mula sa routing bond (`@molecule/app-routing-sveltekit`) sa root na `+layout.svelte`, o tawagin ang `setMoleculeContext({ router })` doon. Kung ginagawa na ito ng app, ang routing bond nito ay mas luma kaysa sa binding na ito: i-update ito (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'Hindi nahanap ang i18n provider sa konteksto',
  'svelte.error.noHttpClient': 'Hindi nahanap ang HTTP client sa konteksto',
  'svelte.error.noStorageProvider': 'Hindi nahanap ang storage provider sa konteksto',
  'svelte.error.noLoggerProvider': 'Hindi nahanap ang logger provider sa konteksto',
  'svelte.error.unknownPaginationDirection':
    'Hindi kilalang direksyon ng pagination: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'Ang useChatProvider ay dapat gamitin sa loob ng ChatProvider',
  'svelte.error.useToastOutsideProvider': 'Ang useToast ay dapat gamitin sa loob ng ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'Dapat gamitin ang useWorkspaceProvider sa loob ng isang WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'Dapat gamitin ang useEditorProvider sa loob ng isang EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'Dapat gamitin ang usePreviewProvider sa loob ng isang PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'Dapat gamitin ang useAuthClient sa loob ng isang AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'Dapat gamitin ang useThemeProvider sa loob ng isang ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Walang router dito. I-mount ang `MoleculeRouterProvider` mula sa routing bond (`@molecule/app-routing-sveltekit`) sa root na `+layout.svelte`, o tawagin ang `setMoleculeContext({ router })` doon. Kung ginagawa na ito ng app, ang routing bond nito ay mas luma kaysa sa binding na ito: i-update ito (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Walang routed view dito. Binibigyan ng SvelteKit ang layout ng pahina nito bilang `children`: ipasa ang `{@render children()}` sa loob ng component na ito.',
  'svelte.error.useHttpOutsideProvider':
    'Dapat gamitin ang useHttpClient sa loob ng isang HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'Dapat gamitin ang useStorageProvider sa loob ng isang StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'Dapat gamitin ang useLoggerProvider sa loob ng isang LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'Dapat gamitin ang useStateProvider sa loob ng isang StateProvider',
  'svelte.error.unsupportedMethod': 'Hindi sinusuportahang pamamaraan: {{method}}',
  'svelte.error.oauthFailed': 'Nabigo ang pag-login sa OAuth',
}
