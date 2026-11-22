import type { SvelteTranslations } from './types.js'

/** Svelte translations for Uzbek. */
export const uz: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Holat provayderi kontekstda topilmadi',
  'svelte.error.noAuthClient': 'Autentifikatsiya mijozi kontekstda topilmadi',
  'svelte.error.noThemeProvider': 'Mavzu provayderi kontekstda topilmadi',
  'svelte.error.noRouter':
    "Bu yerda router yo'q. `+layout.svelte` ildizidagi marshrutizatsiya bog'lanishidan (`@molecule/app-routing-sveltekit`) `MoleculeRouterProvider` ni o'rnating yoki u yerda `setMoleculeContext({ router })` chaqiring.",
  'svelte.error.noI18nProvider': 'I18n provayderi kontekstda topilmadi',
  'svelte.error.noHttpClient': 'HTTP mijozi kontekstda topilmadi',
  'svelte.error.noStorageProvider': 'Saqlash provayderi kontekstda topilmadi',
  'svelte.error.noLoggerProvider': 'Logger provayderi kontekstda topilmadi',
  'svelte.error.unknownPaginationDirection': 'Noma\'lum sahifalash yo\'nalishi: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider ChatProvider ichida ishlatilishi kerak',
  'svelte.error.useToastOutsideProvider': 'useToast ToastProvider ichida ishlatilishi kerak',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ichida ishlatilishi kerak',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ichida ishlatilishi kerak',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ichida ishlatilishi kerak',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ichida ishlatilishi kerak',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider ichida ishlatilishi kerak',
  'svelte.error.useRouterOutsideProvider':
    "Bu yerda router yo'q. `+layout.svelte` ildizidagi marshrutizatsiya bog'lanishidan (`@molecule/app-routing-sveltekit`) `MoleculeRouterProvider` ni o'rnating yoki u yerda `setMoleculeContext({ router })` chaqiring.",
  'svelte.error.noRoutedView':
    "Bu yerda marshrutlangan ko'rinish yo'q. SvelteKit o'z sahifasiga `children` sifatida maket beradi: ushbu komponent ichiga `{@render children()}` ni o'tkazadi.",
  'svelte.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ichida ishlatilishi kerak',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ichida ishlatilishi kerak',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ichida ishlatilishi kerak',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider StateProvider ichida ishlatilishi kerak',
  'svelte.error.unsupportedMethod': "Qo'llab-quvvatlanmaydigan usul: {{method}}",
  'svelte.error.oauthFailed': 'OAuth tizimiga kirish amalga oshmadi',
}
