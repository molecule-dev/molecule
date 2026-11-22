import type { AngularTranslations } from './types.js'

/** Angular translations for Macedonian. */
export const mk: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider мора да се користи внатре во ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient мора да се користи во рамките на AuthProvider',
  'angular.error.oauthFailed': 'Најавувањето со OAuth не успеа',
  'angular.error.unsupportedMethod': 'Неподдржан метод: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider мора да се користи во рамките на StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider мора да се користи внатре во EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient мора да се користи внатре во HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи внатре во LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider мора да се користи внатре во PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Нема рутер овде. Додадете го `provideMoleculeRouter()` од врската за рутирање (`@molecule/app-routing-angular-router`) на провајдерите на апликацијата, по `provideRouter(routes)` на Angular, или пренесете го `router` на `provideMolecule`.',
  'angular.error.noRoutedView':
    'Оваа врска за насочување нема рутиран приказ за прикажување тука: наместо тоа, пренесете ја страницата како деца.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи внатре во StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider мора да се користи внатре во ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора да се користи внатре во WorkspaceProvider',
}
