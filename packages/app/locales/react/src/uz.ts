import type { ReactTranslations } from './types.js'

/** React translations for uz. */
export const uz: Partial<ReactTranslations> = {
  'react.error.useAccordionOutsideProvider':
    'Accordion komponentlari Accordion ichida ishlatilishi kerak',
  'react.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ichida ishlatilishi kerak',
  'react.error.useChatOutsideProvider': 'useChatProvider ChatProvider ichida ishlatilishi kerak',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ichida ishlatilishi kerak',
  'react.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ichida ishlatilishi kerak',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ichida ishlatilishi kerak',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ichida ishlatilishi kerak',
  'react.error.useRouterOutsideProvider':
    "Bu yerda router yo'q. Ilovaning marshrutizatsiya bog'lanishidan (`BrowserRouter` from `@molecule/app-routing-react-router`) marshrutizator komponentini o'rnating yoki `router` `MoleculeProvider` ga uzating. Agar ilova buni allaqachon amalga oshirgan bo'lsa, uning marshrutizatsiya bog'lanishi ushbu bog'lanishdan eskiroq: uni yangilang (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.noRoutedView':
    "Ushbu marshrutlash bog'lanishi bu yerda ko'rsatish uchun marshrutlangan ko'rinishga ega emas: sahifani bolalar sifatida uzating. Agar ilova `@molecule/app-routing-react-router` bilan marshrutlashsa, bu bog'lanish ushbu bog'lanishdan eskiroq: uni yangilang (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.useStoreOutsideProvider': 'useStateProvider StateProvider ichida ishlatilishi kerak',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ichida ishlatilishi kerak',
  'react.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider ichida ishlatilishi kerak',
  'react.error.useToastOutsideProvider': 'useToast ToastProvider ichida ishlatilishi kerak',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ichida ishlatilishi kerak',
  'react.error.unsupportedMethod': "Qo'llab-quvvatlanmaydigan usul: {{method}}",
  'react.error.oauthFailed': 'OAuth orqali kirish amalga oshmadi',
}
