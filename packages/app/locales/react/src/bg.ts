import type { ReactTranslations } from './types.js'

/** React translations for Bulgarian. */
export const bg: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Компонентите Accordion трябва да се използват в Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient трябва да се използва в AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider трябва да се използва в ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider трябва да се използва в EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient трябва да се използва в HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider трябва да се използва в LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider трябва да се използва в PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Няма рутер тук. Монтирайте компонент на рутер от връзката за маршрутизиране на приложението (`BrowserRouter` от `@molecule/app-routing-react-router`) или предайте `router` на `MoleculeProvider`. Ако приложението вече прави това, неговата връзка за маршрутизиране е по-стара от тази връзка: актуализирайте я (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Тази маршрутизираща връзка няма маршрутизиран изглед за рендиране тук: вместо това предайте страницата като деца. Ако приложението маршрутизира с `@molecule/app-routing-react-router`, тази връзка е по-стара от това обвързване: актуализирайте я (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider трябва да се използва в StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider трябва да се използва в StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider трябва да се използва в ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast трябва да се използва в ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider трябва да се използва в WorkspaceProvider',
  'react.error.unsupportedMethod': 'Неподдържан метод: {{method}}',
  'react.error.oauthFailed': 'Входът чрез OAuth не бе успешен',
}
