import type { SolidTranslations } from './types.js'

/** Solid translations for Macedonian. */
export const mk: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider мора да се користи во MoleculeProvider со конфигурирано состојба',
  'solid.error.authOutsideProvider':
    'getAuthClient мора да се користи во MoleculeProvider со конфигурирано автентикација',
  'solid.error.themeOutsideProvider':
    'getThemeProvider мора да се користи во MoleculeProvider со конфигурирано тема',
  'solid.error.routerOutsideProvider':
    'getRouter мора да се користи во MoleculeProvider со конфигурирано рутер',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider мора да се користи во MoleculeProvider со конфигурирано i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient мора да се користи во MoleculeProvider со конфигурирано HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider мора да се користи во MoleculeProvider со конфигурирано складирање',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider мора да се користи во MoleculeProvider со конфигурирано записи',
  'solid.error.useAccordionOutsideProvider':
    'Компонентите на Accordion мора да се користат во Accordion',
  'solid.error.useToastOutsideProvider': 'useToast мора да се користи во ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider мора да се користи внатре во ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора да се користи во рамките на WorkspaceProvider',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider мора да се користи во рамките на EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider мора да се користи во рамките на PreviewProvider',
  'solid.error.useAuthOutsideProvider':
    'useAuthClient мора да се користи во рамките на AuthProvider',
  'solid.error.useHttpOutsideProvider':
    'useHttpClient мора да се користи во рамките на HttpProvider',
  'solid.error.unsupportedMethod': 'Неподдржан метод: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи во рамките на LoggerProvider',
  'solid.error.oauthFailed': 'Најавувањето со OAuth не успеа',
  'solid.error.useRouterOutsideProvider':
    'Нема рутер овде. Користете го `MoleculeRouterProvider` од врската за рутирање (`@molecule/app-routing-solid-router`) како `root` на рутерот или предадете го `router` на `MoleculeProvider`. Ако апликацијата веќе го прави ова, нејзината врска за рутирање е постара од ова поврзување: ажурирајте го (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Нема рутиран приказ овде. Solid Router ѝ ја дава на компонентата на рутата нејзината вгнездена рута како `props.children`: користете го ова како `component` на рутата или пренесете ја страницата како деца.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider мора да се користи во рамките на StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи во рамките на StorageProvider',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider мора да се користи во рамките на ThemeProvider',
}
