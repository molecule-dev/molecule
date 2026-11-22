import type { AngularTranslations } from './types.js'

/** Angular translations for uz. */
export const uz: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ChatProvider ichida ishlatilishi kerak',
  'angular.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ichida ishlatilishi kerak',
  'angular.error.oauthFailed': 'OAuth tizimiga kirish amalga oshmadi',
  'angular.error.unsupportedMethod': "Qo'llab-quvvatlanmaydigan usul: {{method}}",
  'angular.error.useStoreOutsideProvider':
    'useStateProvider StateProvider ichida ishlatilishi kerak',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ichida ishlatilishi kerak',
  'angular.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ichida ishlatilishi kerak',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ichida ishlatilishi kerak',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ichida ishlatilishi kerak',
  'angular.error.useRouterOutsideProvider':
    "Bu yerda marshrutizator yo'q. Angular'ning `provideRouter(routes)` dan keyin marshrutizator bog'lanishidan (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` ilova provayderlariga qo'shing yoki `router` ni `provideMolecule` ga o'tkazing. Agar ilova buni allaqachon amalga oshirgan bo'lsa, uning marshrutizator bog'lanishi ushbu bog'lanishdan eski: uni yangilang (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    "Ushbu marshrutlash bog'lanishida bu yerda ko'rsatish uchun marshrutlash ko'rinishi yo'q: sahifani bolalar sifatida uzating. Agar ilova `@molecule/app-routing-angular-router` bilan marshrutlashsa, bu bog'lanish ushbu bog'lanishdan eskiroq: uni yangilang (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ichida ishlatilishi kerak',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider ichida ishlatilishi kerak',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ichida ishlatilishi kerak',
}
