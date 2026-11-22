import type { VueTranslations } from './types.js'

/** Vue translations for uz. */
export const uz: Partial<VueTranslations> = {
  'vue.error.useRouterOutsideProvider':
    "Bu yerda router yo'q. Ilovani marshrutizatsiya bog'lanishidan (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider` ga o'rang yoki `router` `moleculePlugin` ga uzating. Agar ilova buni allaqachon amalga oshirgan bo'lsa, uning marshrutizatsiya bog'lanishi ushbu bog'lanishdan eskiroq: uni yangilang (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.noRoutedView':
    "Ushbu marshrutlash bog'lanishida bu yerda ko'rsatish uchun marshrutlash ko'rinishi yo'q: sahifani bolalar sifatida uzating. Agar ilova `@molecule/app-routing-vue-router` bilan marshrutlashsa, bu bog'lanish ushbu bog'lanishdan eskiroq: uni yangilang (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.useStoreOutsideProvider': 'useStateProvider StateProvider ichida ishlatilishi kerak',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider ichida ishlatilishi kerak',
  'vue.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ichida ishlatilishi kerak',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ichida ishlatilishi kerak',
  'vue.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ichida ishlatilishi kerak',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ichida ishlatilishi kerak',
  'vue.error.useToastOutsideProvider': 'useToast ToastProvider ichida ishlatilishi kerak',
  'vue.error.unsupportedMethod': "Qo'llab-quvvatlanmaydigan usul: {{method}}",
  'vue.error.useChatOutsideProvider': 'useChatProvider ChatProvider ichida ishlatilishi kerak',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ichida ishlatilishi kerak',
  'vue.error.oauthFailed': 'OAuth tizimiga kirish amalga oshmadi',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ichida ishlatilishi kerak',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ichida ishlatilishi kerak',
}
