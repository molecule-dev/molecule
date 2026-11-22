import type { SolidTranslations } from './types.js'

/** Solid translations for English. */
export const en: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider must be used within a MoleculeProvider with state configured',
  'solid.error.authOutsideProvider':
    'getAuthClient must be used within a MoleculeProvider with auth configured',
  'solid.error.themeOutsideProvider':
    'getThemeProvider must be used within a MoleculeProvider with theme configured',
  'solid.error.routerOutsideProvider':
    'getRouter must be used within a MoleculeProvider with router configured',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider must be used within a MoleculeProvider with i18n configured',
  'solid.error.httpOutsideProvider':
    'getHttpClient must be used within a MoleculeProvider with http configured',
  'solid.error.storageOutsideProvider':
    'getStorageProvider must be used within a MoleculeProvider with storage configured',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider must be used within a MoleculeProvider with logger configured',
  'solid.error.useAccordionOutsideProvider':
    'Accordion components must be used within an Accordion',
  'solid.error.useToastOutsideProvider': 'useToast must be used within a ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider must be used within a ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider must be used within a WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider must be used within an EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider must be used within a PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient must be used within an AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient must be used within an HttpProvider',
  'solid.error.unsupportedMethod': 'Unsupported method: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider must be used within a LoggerProvider',
  'solid.error.oauthFailed': 'OAuth login failed',
  'solid.error.useRouterOutsideProvider':
    "No router here. Use `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-solid-router`) as the router's `root`, or pass `router` to `MoleculeProvider`. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-solid-router@latest`).",
  'solid.error.noRoutedView':
    "No routed view here. Solid Router gives a route's component its nested route as `props.children`: use this as a route's `component`, or pass the page as children.",
  'solid.error.useStoreOutsideProvider': 'useStateProvider must be used within a StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider must be used within a StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider must be used within a ThemeProvider',
}
