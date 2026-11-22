import type { AngularTranslations } from './types.js'

/** Angular translations for Turkish. */
export const tr: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider bir ChatProvider içinde kullanılmalıdır',
  'angular.error.useAuthOutsideProvider': 'useAuthClient, bir AuthProvider içinde kullanılmalıdır.',
  'angular.error.oauthFailed': 'OAuth oturum açma işlemi başarısız oldu.',
  'angular.error.unsupportedMethod': 'Desteklenmeyen yöntem: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider, bir StateProvider içinde kullanılmalıdır.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider bir EditorProvider içinde kullanılmalıdır',
  'angular.error.useHttpOutsideProvider': 'useHttpClient bir HttpProvider içinde kullanılmalıdır',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider bir LoggerProvider içinde kullanılmalıdır',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider bir PreviewProvider içinde kullanılmalıdır',
  'angular.error.useRouterOutsideProvider':
    "Burada yönlendirici yok. Yönlendirme bağından (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` , Angular'ın `provideRouter(routes)` sonra uygulamanın sağlayıcılarına ekleyin veya `router` `provideMolecule` geçirin. Uygulama bunu zaten yapıyorsa, yönlendirme bağı bu bağlamadan daha eskidir: onu güncelleyin (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    'Bu yönlendirme bağlantısında burada işlenecek yönlendirilmiş bir görünüm yok: bunun yerine sayfayı alt öğeler olarak geçirin. Uygulama `@molecule/app-routing-angular-router` ile yönlendiriliyorsa, bu bağlantı bu bağlamadan daha eskidir: onu güncelleyin (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider bir StorageProvider içinde kullanılmalıdır',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider bir ThemeProvider içinde kullanılmalıdır',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider bir WorkspaceProvider içinde kullanılmalıdır',
}
