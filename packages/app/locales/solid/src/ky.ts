import type { SolidTranslations } from './types.js'

/** Solid translations for Kyrgyz. */
export const ky: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider MoleculeProvider ичинде конфигурацияланган колдонулушу керек абалменен',
  'solid.error.authOutsideProvider':
    'getAuthClient MoleculeProvider ичинде конфигурацияланган колдонулушу керек аутентификацияменен',
  'solid.error.themeOutsideProvider':
    'getThemeProvider MoleculeProvider ичинде конфигурацияланган колдонулушу керек темаменен',
  'solid.error.routerOutsideProvider':
    'getRouter MoleculeProvider ичинде конфигурацияланган колдонулушу керек роутерменен',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider MoleculeProvider ичинде конфигурацияланган колдонулушу керек i18n-менен',
  'solid.error.httpOutsideProvider':
    'getHttpClient MoleculeProvider ичинде конфигурацияланган колдонулушу керек HTTP-менен',
  'solid.error.storageOutsideProvider':
    'getStorageProvider MoleculeProvider ичинде конфигурацияланган колдонулушу керек сактооменен',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider MoleculeProvider ичинде конфигурацияланган колдонулушу керек логгерменен',
  'solid.error.useAccordionOutsideProvider':
    'Accordion компоненттери Accordion ичинде колдонулушу керек',
  'solid.error.useToastOutsideProvider': 'useToast ToastProvider ичинде колдонулушу керек',
  'solid.error.useChatOutsideProvider': 'useChatProvider ChatProvider ичинде колдонулушу керек',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ичинде колдонулушу керек',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ичинде колдонулушу керек',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ичинде колдонулушу керек',
  'solid.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ичинде колдонулушу керек',
  'solid.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ичинде колдонулушу керек',
  'solid.error.unsupportedMethod': 'Колдоого алынбаган ыкма: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ичинде колдонулушу керек',
  'solid.error.oauthFailed': 'OAuth кирүүсү ишке ашкан жок',
  'solid.error.useRouterOutsideProvider':
    'Бул жерде роутер жок. Роутердин `root` катары маршрутизатор байланышынан (`@molecule/app-routing-solid-router`) `MoleculeRouterProvider` колдонуңуз же `router` `MoleculeProvider` өткөрүңүз.',
  'solid.error.noRoutedView':
    'Бул жерде маршрутталган көрүнүш жок. Solid Router маршруттун компонентине өзүнүн ички маршрутун `props.children` катары берет: муну маршруттун `component` катары колдонуңуз же баракты балдар катары өткөрүп бериңиз.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider StateProvider ичинде колдонулушу керек',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ичинде колдонулушу керек',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider ичинде колдонулушу керек',
}
