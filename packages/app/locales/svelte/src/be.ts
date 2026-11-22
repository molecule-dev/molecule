import type { SvelteTranslations } from './types.js'

/** Svelte translations for Belarusian. */
export const be: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Пастаўшчык стану не знойдзены ў кантэксце',
  'svelte.error.noAuthClient': 'Кліент аўтэнтыфікацыі не знойдзены ў кантэксце',
  'svelte.error.noThemeProvider': 'Пастаўшчык тэмы не знойдзены ў кантэксце',
  'svelte.error.noRouter':
    'Тут няма маршрутызатара. Падключыце `MoleculeRouterProvider` да маршрутызацыйнай сувязі (`@molecule/app-routing-sveltekit`) у корані `+layout.svelte` або выклічце там `setMoleculeContext({ router })` .',
  'svelte.error.noI18nProvider': 'Пастаўшчык i18n не знойдзены ў кантэксце',
  'svelte.error.noHttpClient': 'HTTP кліент не знойдзены ў кантэксце',
  'svelte.error.noStorageProvider': 'Пастаўшчык сховішча не знойдзены ў кантэксце',
  'svelte.error.noLoggerProvider': 'Пастаўшчык лагера не знойдзены ў кантэксце',
  'svelte.error.unknownPaginationDirection': 'Невядомы кірунак пагінацыі: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider павінен выкарыстоўвацца ўнутры ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast павінен выкарыстоўвацца ўнутры ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider павінен выкарыстоўвацца ўнутры WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider павінен выкарыстоўвацца ўнутры EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider павінен выкарыстоўвацца ўнутры PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient павінен выкарыстоўвацца ўнутры AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider павінен выкарыстоўвацца ўнутры ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Тут няма маршрутызатара. Падключыце `MoleculeRouterProvider` да маршрутызацыйнай сувязі (`@molecule/app-routing-sveltekit`) у корані `+layout.svelte` або выклічце там `setMoleculeContext({ router })` .',
  'svelte.error.noRoutedView':
    'Тут няма маршрутызаванага прагляду. SvelteKit дае макету старонкі як `children`: перадайце `{@render children()}` унутр гэтага кампанента.',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient павінен выкарыстоўвацца ўнутры HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider павінен выкарыстоўвацца ўнутры StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider павінен выкарыстоўвацца ўнутры LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider павінен выкарыстоўвацца ўнутры StateProvider',
  'svelte.error.unsupportedMethod': 'Непадтрымоўваны метад: {{method}}',
  'svelte.error.oauthFailed': 'Памылка ўваходу праз OAuth',
}
