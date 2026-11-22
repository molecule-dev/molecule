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
    'Няма рутер тук. Монтирайте компонент на рутер от връзката за рутиране на приложението (`BrowserRouter` от `@molecule/app-routing-react-router`) или предайте `router` на `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Тази маршрутизираща връзка няма маршрутизиран изглед за рендиране тук: вместо това предайте страницата като деца.',
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
