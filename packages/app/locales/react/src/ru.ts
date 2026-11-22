import type { ReactTranslations } from './types.js'

/** React translations for Russian. */
export const ru: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Компоненты Accordion должны использоваться внутри Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient должен использоваться внутри AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider должен использоваться внутри ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider должен использоваться внутри EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient должен использоваться внутри HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider должен использоваться внутри LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider должен использоваться внутри PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Здесь нет маршрутизатора. Подключите компонент маршрутизатора из связывания маршрутизации приложения (`BrowserRouter` из `@molecule/app-routing-react-router`) или передайте `router` в `MoleculeProvider`. Если приложение уже это делает, его связывание маршрутизации старше, чем это связывание: обновите его (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'В этом маршрутном интерфейсе нет маршрутизируемого представления для отображения: вместо этого передайте страницу в качестве дочерних элементов. Если приложение использует маршрутизацию с `@molecule/app-routing-react-router`, то этот интерфейс старше данного привязки: обновите его (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider должен использоваться внутри StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider должен использоваться внутри StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider должен использоваться внутри ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast должен использоваться внутри ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider должен использоваться внутри WorkspaceProvider',
  'react.error.unsupportedMethod': 'Неподдерживаемый метод: {{method}}',
  'react.error.oauthFailed': 'Не удалось войти через OAuth',
}
