import type { AngularTranslations } from './types.js'

/** Angular translations for Ukrainian. */
export const uk: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider повинен використовуватися всередині ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient має використовуватися в AuthProvider',
  'angular.error.oauthFailed': 'Не вдалося ввійти через OAuth',
  'angular.error.unsupportedMethod': 'Непідтримуваний метод: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider має використовуватися всередині StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider повинен використовуватися всередині EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient повинен використовуватися всередині HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider повинен використовуватися всередині LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider повинен використовуватися всередині PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    "Тут немає маршрутизатора. Додайте `provideMoleculeRouter()` з маршрутизаційного зв'язку (`@molecule/app-routing-angular-router`) до провайдерів застосунку після `provideRouter(routes)` Angular або передайте `router` до `provideMolecule`.",
  'angular.error.noRoutedView':
    "Цей зв'язок маршрутизації не має маршрутизованого представлення для відображення тут: натомість передайте сторінку як дочірні елементи.",
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider повинен використовуватися всередині StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider повинен використовуватися всередині ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider повинен використовуватися всередині WorkspaceProvider',
}
