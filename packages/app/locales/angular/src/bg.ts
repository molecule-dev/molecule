import type { AngularTranslations } from './types.js'

/** Angular translations for Bulgarian. */
export const bg: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider трябва да се използва в ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient трябва да се използва в рамките на AuthProvider',
  'angular.error.oauthFailed': 'Влизането чрез OAuth не бе успешно',
  'angular.error.unsupportedMethod': 'Неподдържан метод: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider трябва да се използва в рамките на StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider трябва да се използва в EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient трябва да се използва в HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider трябва да се използва в LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider трябва да се използва в PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Няма рутер тук. Добавете `provideMoleculeRouter()` от връзката за рутиране (`@molecule/app-routing-angular-router`) към доставчиците на приложението, след `provideRouter(routes)` на Angular, или предайте `router` на `provideMolecule`.',
  'angular.error.noRoutedView':
    'Тази маршрутизираща връзка няма маршрутизиран изглед за рендиране тук: вместо това предайте страницата като деца.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider трябва да се използва в StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider трябва да се използва в ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider трябва да се използва в WorkspaceProvider',
}
