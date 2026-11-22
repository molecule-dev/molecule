import type { ReactTranslations } from './types.js'

/** React translations for Ukrainian. */
export const uk: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Компоненти Accordion повинні використовуватися всередині Accordion',
  'react.error.useAuthOutsideProvider':
    'useAuthClient повинен використовуватися всередині AuthProvider',
  'react.error.useChatOutsideProvider':
    'useChatProvider повинен використовуватися всередині ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider повинен використовуватися всередині EditorProvider',
  'react.error.useHttpOutsideProvider':
    'useHttpClient повинен використовуватися всередині HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider повинен використовуватися всередині LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider повинен використовуватися всередині PreviewProvider',
  'react.error.useRouterOutsideProvider':
    "Тут немає маршрутизатора. Змонтуйте компонент маршрутизатора з маршрутизаційного зв'язку програми (`BrowserRouter` з `@molecule/app-routing-react-router`) або передайте `router` до `MoleculeProvider`.",
  'react.error.noRoutedView':
    "Цей зв'язок маршрутизації не має маршрутизованого представлення для відображення тут: натомість передайте сторінку як дочірні елементи.",
  'react.error.useStoreOutsideProvider':
    'useStateProvider повинен використовуватися всередині StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider повинен використовуватися всередині StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider повинен використовуватися всередині ThemeProvider',
  'react.error.useToastOutsideProvider':
    'useToast повинен використовуватися всередині ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider повинен використовуватися всередині WorkspaceProvider',
  'react.error.unsupportedMethod': 'Непідтримуваний метод: {{method}}',
  'react.error.oauthFailed': 'Не вдалося увійти через OAuth',
}
