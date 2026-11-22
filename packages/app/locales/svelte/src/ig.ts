import type { SvelteTranslations } from './types.js'

/** Svelte translations for Igbo. */
export const ig: SvelteTranslations = {
  'svelte.error.noStateProvider': 'A choghi onye na-enye steeti na kontekst',
  'svelte.error.noAuthClient': 'A choghi klayenti ikike na kontekst',
  'svelte.error.noThemeProvider': 'A choghi onye na-enye isiokwu na kontekst',
  'svelte.error.noRouter':
    'Enweghị rawụta ebe a. Tinye `MoleculeRouterProvider` site na njikọ routing (`@molecule/app-routing-sveltekit`) na mgbọrọgwụ `+layout.svelte`, ma ọ bụ kpọọ `setMoleculeContext({ router })` ebe ahụ. Ọ bụrụ na ngwa ahụ emeela nke a, njikọ routing ya adịla ochie karịa njikọ a: melite ya (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'A choghi onye na-enye i18n na kontekst',
  'svelte.error.noHttpClient': 'A choghi klayenti HTTP na kontekst',
  'svelte.error.noStorageProvider': 'A choghi onye na-enye nchekwa na kontekst',
  'svelte.error.noLoggerProvider': 'A choghi onye na-enye ndekota na kontekst',
  'svelte.error.unknownPaginationDirection': 'Ntuzighari pagineshon amagh\u1ecb: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': "A ga-eji useChatProvider n'ime ChatProvider",
  'svelte.error.useToastOutsideProvider': "A ga-eji Toast mee ihe n'ime Onye Na-enye Toast",
  'svelte.error.useWorkspaceOutsideProvider':
    "A ga-eji onye na-enye ọrụ useWorkspaceProvider n'ime onye na-enye ọrụ",
  'svelte.error.useEditorOutsideProvider': "A ga-eji useEditorProvider n'ime Onye Na-enye Editor",
  'svelte.error.usePreviewOutsideProvider': "A ga-eji usePreviewProvider n'ime PreviewProvider",
  'svelte.error.useAuthOutsideProvider': "A ga-eji useAuthClient mee ihe n'ime Onye Na-enye ikike",
  'svelte.error.useThemeOutsideProvider': "A ga-eji useThemeProvider n'ime ThemeProvider",
  'svelte.error.useRouterOutsideProvider':
    'Enweghị rawụta ebe a. Tinye `MoleculeRouterProvider` site na njikọ routing (`@molecule/app-routing-sveltekit`) na mgbọrọgwụ `+layout.svelte`, ma ọ bụ kpọọ `setMoleculeContext({ router })` ebe ahụ. Ọ bụrụ na ngwa ahụ emeela nke a, njikọ routing ya adịla ochie karịa njikọ a: melite ya (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    "Enweghị echiche a na-agagharị ebe a. SvelteKit na-enye nhazi peeji ya dị ka `children`: gafere `{@render children()}` n'ime ihe a.",
  'svelte.error.useHttpOutsideProvider': "A ga-eji useHttpClient mee ihe n'ime HttpProvider",
  'svelte.error.useStorageOutsideProvider':
    "A ga-eji onye na-enye nchekwa data (useStorageProvider) n'ime onye na-enye nchekwa data",
  'svelte.error.useLoggerOutsideProvider': "A ga-eji useLoggerProvider n'ime LoggerProvider",
  'svelte.error.useStoreOutsideProvider': "A ga-eji useStateProvider n'ime Onye Na-enye Steeti",
  'svelte.error.unsupportedMethod': 'Usoro anaghị akwado: {{method}}',
  'svelte.error.oauthFailed': 'Nbanye OAuth agaghị arụ ọrụ',
}
