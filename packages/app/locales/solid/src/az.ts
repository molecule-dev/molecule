import type { SolidTranslations } from './types.js'

/** Solid translations for Azerbaijani. */
export const az: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider vəziyyət konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.authOutsideProvider':
    'getAuthClient autentifikasiya konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.themeOutsideProvider':
    'getThemeProvider tema konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.routerOutsideProvider':
    'getRouter router konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider i18n konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.httpOutsideProvider':
    'getHttpClient HTTP konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.storageOutsideProvider':
    'getStorageProvider saxlama konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider loger konfiqurasiya edilmiş MoleculeProvider daxilində istifadə edilməlidir',
  'solid.error.useAccordionOutsideProvider':
    'Accordion komponentləri Accordion daxilində istifadə edilməlidir',
  'solid.error.useToastOutsideProvider': 'useToast ToastProvider daxilində istifadə edilməlidir',
  'solid.error.useChatOutsideProvider':
    'useChatProvider ChatProvider daxilində istifadə edilməlidir',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider daxilində istifadə olunmalıdır',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider daxilində istifadə olunmalıdır',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider, PreviewProvider daxilində istifadə olunmalıdır',
  'solid.error.useAuthOutsideProvider': 'useAuthClient AuthProvider daxilində istifadə olunmalıdır',
  'solid.error.useHttpOutsideProvider': 'useHttpClient HttpProvider daxilində istifadə olunmalıdır',
  'solid.error.unsupportedMethod': 'Dəstəklənməyən metod: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider daxilində istifadə olunmalıdır',
  'solid.error.oauthFailed': 'OAuth girişi uğursuz oldu',
  'solid.error.useRouterOutsideProvider':
    'Burada router yoxdur. Routerin `root` olaraq marşrutlaşdırma bağlantısından (`@molecule/app-routing-solid-router`) `MoleculeRouterProvider` istifadə edin və ya `router` `MoleculeProvider`-ə ötürün. Əgər tətbiq bunu artıq edirsə, onun marşrutlaşdırma bağlantısı bu bağlantıdan köhnədir: onu yeniləyin (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Burada marşrutlaşdırılmış görünüş yoxdur. Solid Router, marşrutun komponentinə iç içə marşrutunu `props.children` olaraq verir: bunu marşrutun `component` kimi istifadə edin və ya səhifəni uşaq kimi ötürün.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider, StateProvider daxilində istifadə olunmalıdır',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider, StorageProvider daxilində istifadə olunmalıdır',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider, ThemeProvider daxilində istifadə olunmalıdır',
}
