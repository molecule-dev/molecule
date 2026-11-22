import type { AngularTranslations } from './types.js'

/** Angular translations for Russian. */
export const ru: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider должен использоваться внутри ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'Метод useAuthClient необходимо использовать внутри AuthProvider.',
  'angular.error.oauthFailed': 'Не удалось выполнить вход через OAuth.',
  'angular.error.unsupportedMethod': 'Неподдерживаемый метод: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'Метод useStateProvider должен использоваться внутри StateProvider.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider должен использоваться внутри EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient должен использоваться внутри HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider должен использоваться внутри LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider должен использоваться внутри PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Маршрутизатора здесь нет. Добавьте `provideMoleculeRouter()` из связи маршрутизации (`@molecule/app-routing-angular-router`) в провайдеры приложения после `provideRouter(routes)` в Angular или передайте `router` в `provideMolecule`. Если приложение уже это делает, его связь маршрутизации старше этой привязки: обновите её (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'В этом маршрутном интерфейсе нет маршрутизируемого представления для отображения: вместо этого передайте страницу в качестве дочерних элементов. Если приложение использует маршрутизацию с `@molecule/app-routing-angular-router`, то этот интерфейс старше данного привязки: обновите его (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider должен использоваться внутри StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider должен использоваться внутри ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider должен использоваться внутри WorkspaceProvider',
}
