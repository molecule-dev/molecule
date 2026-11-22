import type { SolidTranslations } from './types.js'

/** Solid translations for Turkish. */
export const tr: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır durum',
  'solid.error.authOutsideProvider':
    'getAuthClient yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır kimlik doğrulama',
  'solid.error.themeOutsideProvider':
    'getThemeProvider yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır tema',
  'solid.error.routerOutsideProvider':
    'getRouter yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır yönlendirici',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır depolama',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider yapılandırılmış bir MoleculeProvider içinde kullanılmalıdır günlük',
  'solid.error.useAccordionOutsideProvider':
    'Accordion bileşenleri bir Accordion içinde kullanılmalıdır',
  'solid.error.useToastOutsideProvider': 'useToast bir ToastProvider içinde kullanılmalıdır',
  'solid.error.useChatOutsideProvider': 'useChatProvider bir ChatProvider içinde kullanılmalıdır',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider, bir WorkspaceProvider içinde kullanılmalıdır.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider, bir EditorProvider içinde kullanılmalıdır.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider, bir PreviewProvider içinde kullanılmalıdır.',
  'solid.error.useAuthOutsideProvider': 'useAuthClient, bir AuthProvider içinde kullanılmalıdır.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient bir HttpProvider içinde kullanılmalıdır',
  'solid.error.unsupportedMethod': 'Desteklenmeyen yöntem: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider, bir LoggerProvider içinde kullanılmalıdır.',
  'solid.error.oauthFailed': 'OAuth oturum açma işlemi başarısız oldu.',
  'solid.error.useRouterOutsideProvider':
    'Burada yönlendirici yok. Yönlendiricinin `root` olarak yönlendirme bağından (`@molecule/app-routing-solid-router`) `MoleculeRouterProvider` kullanın veya `router` `MoleculeProvider` iletin.',
  'solid.error.noRoutedView':
    'Burada yönlendirilmiş bir görünüm yok. Solid Router, bir rotanın bileşenine iç içe geçmiş rotasını `props.children` olarak verir: bunu bir rotanın `component` olarak kullanın veya sayfayı children olarak iletin.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider, bir StateProvider içinde kullanılmalıdır.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider, bir StorageProvider içinde kullanılmalıdır.',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider, bir ThemeProvider içinde kullanılmalıdır.',
}
