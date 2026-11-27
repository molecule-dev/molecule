import type { SvelteTranslations } from './types.js'

/** Svelte translations for Swahili. */
export const sw: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Mtoa huduma wa hali hakupatikana katika muktadha',
  'svelte.error.noAuthClient': 'Mteja wa uthibitishaji hakupatikana katika muktadha',
  'svelte.error.noThemeProvider': 'Mtoa huduma wa mandhari hakupatikana katika muktadha',
  'svelte.error.noRouter':
    'Hakuna kipanga njia hapa. Weka `MoleculeRouterProvider` kutoka kwa dhamana ya uelekezaji (`@molecule/app-routing-sveltekit`) kwenye mzizi `+layout.svelte`, au uite `setMoleculeContext({ router })` hapo. Ikiwa programu tayari inafanya hivi, dhamana yake ya uelekezaji ni ya zamani kuliko dhamana hii: isasishe (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'Mtoa huduma wa i18n hakupatikana katika muktadha',
  'svelte.error.noHttpClient': 'Mteja wa HTTP hakupatikana katika muktadha',
  'svelte.error.noStorageProvider': 'Mtoa huduma wa hifadhi hakupatikana katika muktadha',
  'svelte.error.noLoggerProvider': 'Mtoa huduma wa kumbukumbu hakupatikana katika muktadha',
  'svelte.error.unknownPaginationDirection': 'Mwelekeo usiojulikana wa kurasa: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider lazima utumike ndani ya ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast lazima utumike ndani ya ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'Mtoaji wa UseWorkspace lazima atumike ndani ya Mtoaji wa UseWorkspace',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider lazima itumike ndani ya EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider lazima itumike ndani ya PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient lazima itumike ndani ya AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider lazima itumike ndani ya ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Hakuna kipanga njia hapa. Weka `MoleculeRouterProvider` kutoka kwa dhamana ya uelekezaji (`@molecule/app-routing-sveltekit`) kwenye mzizi `+layout.svelte`, au uite `setMoleculeContext({ router })` hapo. Ikiwa programu tayari inafanya hivi, dhamana yake ya uelekezaji ni ya zamani kuliko dhamana hii: isasishe (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Hakuna mwonekano uliopangwa hapa. SvelteKit inatoa mpangilio ukurasa wake kama `children`: pitisha `{@render children()}` ndani ya sehemu hii.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient lazima itumike ndani ya HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider lazima itumike ndani ya StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider lazima itumike ndani ya LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider lazima itumike ndani ya StateProvider',
  'svelte.error.unsupportedMethod': 'Mbinu isiyoungwa mkono: {{method}}',
  'svelte.error.oauthFailed': 'Kuingia kwa OAuth kumeshindwa',
}
