import type { SolidTranslations } from './types.js'

/** Solid translations for Ukrainian. */
export const uk: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider повинен використовуватися всередині MoleculeProvider з налаштованим станом',
  'solid.error.authOutsideProvider':
    'getAuthClient повинен використовуватися всередині MoleculeProvider з налаштованим автентифікацією',
  'solid.error.themeOutsideProvider':
    'getThemeProvider повинен використовуватися всередині MoleculeProvider з налаштованим темою',
  'solid.error.routerOutsideProvider':
    'getRouter повинен використовуватися всередині MoleculeProvider з налаштованим маршрутизатором',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider повинен використовуватися всередині MoleculeProvider з налаштованим i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient повинен використовуватися всередині MoleculeProvider з налаштованим HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider повинен використовуватися всередині MoleculeProvider з налаштованим сховищем',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider повинен використовуватися всередині MoleculeProvider з налаштованим логером',
  'solid.error.useAccordionOutsideProvider':
    'Компоненти Accordion повинні використовуватися всередині Accordion',
  'solid.error.useToastOutsideProvider':
    'useToast повинен використовуватися всередині ToastProvider',
  'solid.error.useChatOutsideProvider':
    'useChatProvider повинен використовуватися всередині ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider має використовуватися всередині WorkspaceProvider',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider має використовуватися всередині EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider має використовуватися всередині PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient має використовуватися в AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient має використовуватися в HttpProvider',
  'solid.error.unsupportedMethod': 'Непідтримуваний метод: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider має використовуватися всередині LoggerProvider',
  'solid.error.oauthFailed': 'Не вдалося ввійти через OAuth',
  'solid.error.useRouterOutsideProvider':
    "Тут немає маршрутизатора. Використовуйте `MoleculeRouterProvider` з маршрутизаційного зв'язку (`@molecule/app-routing-solid-router`) як `root` маршрутизатора або передайте `router` до `MoleculeProvider`. Якщо застосунок вже це робить, його маршрутизаційний зв'язок старший за цей зв'язок: оновіть його (`npm install @molecule/app-routing-solid-router@latest`).",
  'solid.error.noRoutedView':
    'Тут немає маршрутизованого представлення. Solid Router надає компоненту маршруту його вкладений маршрут як `props.children`: використовуйте це як `component` маршруту або передайте сторінку як дочірні елементи.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider має використовуватися всередині StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider має використовуватися всередині StorageProvider',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider має використовуватися всередині ThemeProvider',
}
