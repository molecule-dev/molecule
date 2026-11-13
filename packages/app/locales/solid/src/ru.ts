import type { SolidTranslations } from './types.js'

/** Solid translations for Russian. */
export const ru: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider должен использоваться внутри MoleculeProvider с настроенным состоянием',
  'solid.error.authOutsideProvider':
    'getAuthClient должен использоваться внутри MoleculeProvider с настроенным аутентификацией',
  'solid.error.themeOutsideProvider':
    'getThemeProvider должен использоваться внутри MoleculeProvider с настроенным темой',
  'solid.error.routerOutsideProvider':
    'getRouter должен использоваться внутри MoleculeProvider с настроенным роутером',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider должен использоваться внутри MoleculeProvider с настроенным i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient должен использоваться внутри MoleculeProvider с настроенным HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider должен использоваться внутри MoleculeProvider с настроенным хранилищем',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider должен использоваться внутри MoleculeProvider с настроенным логгером',
  'solid.error.useAccordionOutsideProvider':
    'Компоненты Accordion должны использоваться внутри Accordion',
  'solid.error.useToastOutsideProvider': 'useToast должен использоваться внутри ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider должен использоваться внутри ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'Параметр useWorkspaceProvider должен использоваться внутри WorkspaceProvider.',
  'solid.error.useEditorOutsideProvider':
    'Метод useEditorProvider должен использоваться внутри метода EditorProvider.',
  'solid.error.usePreviewOutsideProvider':
    'Параметр usePreviewProvider должен использоваться внутри параметра PreviewProvider.',
  'solid.error.useAuthOutsideProvider':
    'Метод useAuthClient необходимо использовать внутри AuthProvider.',
  'solid.error.useHttpOutsideProvider':
    'Функция useHttpClient должна использоваться внутри объекта HttpProvider.',
  'solid.error.unsupportedMethod': 'Неподдерживаемый метод: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'Параметр useLoggerProvider должен использоваться внутри LoggerProvider.',
  'solid.error.oauthFailed': 'Не удалось выполнить вход через OAuth.',
  'solid.error.useRouterOutsideProvider':
    'Параметр useRouterInstance должен использоваться внутри RouterProvider.',
  'solid.error.useStoreOutsideProvider':
    'Метод useStateProvider должен использоваться внутри StateProvider.',
  'solid.error.useStorageOutsideProvider':
    'Параметр useStorageProvider должен использоваться внутри параметра StorageProvider.',
  'solid.error.useThemeOutsideProvider':
    'Параметр useThemeProvider должен использоваться внутри параметра ThemeProvider.',
}
