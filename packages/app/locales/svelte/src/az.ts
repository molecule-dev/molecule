import type { SvelteTranslations } from './types.js'

/** Svelte translations for Azerbaijani. */
export const az: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Vəziyyət provayderi kontekstdə tapılmadı',
  'svelte.error.noAuthClient': 'Autentifikasiya klienti kontekstdə tapılmadı',
  'svelte.error.noThemeProvider': 'Tema provayderi kontekstdə tapılmadı',
  'svelte.error.noRouter':
    'Burada router yoxdur. `+layout.svelte` kökündəki marşrutlaşdırma bağlantısından (`@molecule/app-routing-sveltekit`) `MoleculeRouterProvider` qoşun və ya orada `setMoleculeContext({ router })` çağırın. Əgər tətbiq bunu artıq edirsə, onun marşrutlaşdırma bağlantısı bu bağlantıdan daha köhnədir: onu yeniləyin (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n provayderi kontekstdə tapılmadı',
  'svelte.error.noHttpClient': 'HTTP klienti kontekstdə tapılmadı',
  'svelte.error.noStorageProvider': 'Saxlama provayderi kontekstdə tapılmadı',
  'svelte.error.noLoggerProvider': 'Loger provayderi kontekstdə tapılmadı',
  'svelte.error.unknownPaginationDirection': 'Naməlum səhifələmə istiqaməti: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider ChatProvider daxilində istifadə edilməlidir',
  'svelte.error.useToastOutsideProvider': 'useToast ToastProvider daxilində istifadə edilməlidir',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider daxilində istifadə olunmalıdır',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider daxilində istifadə olunmalıdır',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider, PreviewProvider daxilində istifadə olunmalıdır',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient AuthProvider daxilində istifadə olunmalıdır',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider, ThemeProvider daxilində istifadə olunmalıdır',
  'svelte.error.useRouterOutsideProvider':
    'Burada router yoxdur. `+layout.svelte` kökündəki marşrutlaşdırma bağlantısından (`@molecule/app-routing-sveltekit`) `MoleculeRouterProvider` qoşun və ya orada `setMoleculeContext({ router })` çağırın. Əgər tətbiq bunu artıq edirsə, onun marşrutlaşdırma bağlantısı bu bağlantıdan daha köhnədir: onu yeniləyin (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Burada yönləndirilmiş görünüş yoxdur. SvelteKit səhifəsinə `children` kimi bir düzen verir: bu komponentin içinə `{@render children()}` göndərir.',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient HttpProvider daxilində istifadə olunmalıdır',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider, StorageProvider daxilində istifadə olunmalıdır',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider daxilində istifadə olunmalıdır',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider, StateProvider daxilində istifadə olunmalıdır',
  'svelte.error.unsupportedMethod': 'Dəstəklənməyən metod: {{method}}',
  'svelte.error.oauthFailed': 'OAuth girişi uğursuz oldu',
}
