import type { ReactTranslations } from './types.js'

/** React translations for Turkish. */
export const tr: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion bileşenleri bir Accordion içinde kullanılmalıdır',
  'react.error.useAuthOutsideProvider': 'useAuthClient bir AuthProvider içinde kullanılmalıdır',
  'react.error.useChatOutsideProvider': 'useChatProvider bir ChatProvider içinde kullanılmalıdır',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider bir EditorProvider içinde kullanılmalıdır',
  'react.error.useHttpOutsideProvider': 'useHttpClient bir HttpProvider içinde kullanılmalıdır',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider bir LoggerProvider içinde kullanılmalıdır',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider bir PreviewProvider içinde kullanılmalıdır',
  'react.error.useRouterOutsideProvider':
    'Burada yönlendirici yok. Uygulamanın yönlendirme bağından bir yönlendirici bileşeni ekleyin ( `@molecule/app-routing-react-router` `BrowserRouter` ) veya `router` `MoleculeProvider` iletin. Uygulama bunu zaten yapıyorsa, yönlendirme bağı bu bağlamadan daha eskidir: onu güncelleyin (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Bu yönlendirme bağlantısında burada işlenecek yönlendirilmiş bir görünüm yok: bunun yerine sayfayı alt öğeler olarak geçirin. Uygulama `@molecule/app-routing-react-router` ile yönlendiriliyorsa, bu bağlantı bu bağlamadan daha eskidir: onu güncelleyin (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider bir StateProvider içinde kullanılmalıdır',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider bir StorageProvider içinde kullanılmalıdır',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider bir ThemeProvider içinde kullanılmalıdır',
  'react.error.useToastOutsideProvider': 'useToast bir ToastProvider içinde kullanılmalıdır',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider bir WorkspaceProvider içinde kullanılmalıdır',
  'react.error.unsupportedMethod': 'Desteklenmeyen yöntem: {{method}}',
  'react.error.oauthFailed': 'OAuth ile giriş başarısız oldu',
}
