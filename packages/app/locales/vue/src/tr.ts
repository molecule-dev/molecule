import type { VueTranslations } from './types.js'

/** Vue translations for Turkish. */
export const tr: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Burada yönlendirici yok. Uygulamayı yönlendirme bağından (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider` ile sarın veya `router` `moleculePlugin` iletin. Uygulama bunu zaten yapıyorsa, yönlendirme bağı bu bağlamadan daha eskidir: onu güncelleyin (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Bu yönlendirme bağlantısında burada işlenecek yönlendirilmiş bir görünüm yok: bunun yerine sayfayı alt öğeler olarak geçirin. Uygulama `@molecule/app-routing-vue-router` ile yönlendiriliyorsa, bu bağlantı bu bağlamadan daha eskidir: onu güncelleyin (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider bir StateProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider bir ThemeProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient bir AuthProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider bir StorageProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient bir HttpProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider bir LoggerProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.useToastOutsideProvider':
    'useToast bir ToastProvider i\u00e7inde kullan\u0131lmal\u0131d\u0131r',
  'vue.error.unsupportedMethod': 'Desteklenmeyen y\u00f6ntem: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider bir ChatProvider içinde kullanılmalıdır',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider, bir EditorProvider içinde kullanılmalıdır.',
  'vue.error.oauthFailed': 'OAuth oturum açma işlemi başarısız oldu.',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider, bir PreviewProvider içinde kullanılmalıdır.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider, bir WorkspaceProvider içinde kullanılmalıdır.',
}
