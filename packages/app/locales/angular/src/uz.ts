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
    "Bu yerda router yo'q. Angular'ning `provideRouter(routes)` dan keyin marshrutizatsiya bog'lanishidan (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` ilova provayderlariga qo'shing yoki `router` ni `provideMolecule` ga o'tkazing.",
  'angular.error.noRoutedView':
    "Ushbu marshrutlash bog'lanishida bu yerda ko'rsatish uchun marshrutlangan ko'rinish yo'q: buning o'rniga sahifani bolalar sifatida uzating.",
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ichida ishlatilishi kerak',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider ichida ishlatilishi kerak',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ichida ishlatilishi kerak',
}
