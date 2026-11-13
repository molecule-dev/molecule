import type { SolidTranslations } from './types.js'

/** Solid translations for Czech. */
export const cs: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným stavem',
  'solid.error.authOutsideProvider':
    'getAuthClient musí být použit uvnitř MoleculeProvider s nakonfigurovaným autentizací',
  'solid.error.themeOutsideProvider':
    'getThemeProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným motivem',
  'solid.error.routerOutsideProvider':
    'getRouter musí být použit uvnitř MoleculeProvider s nakonfigurovaným routerem',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient musí být použit uvnitř MoleculeProvider s nakonfigurovaným HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným úložištěm',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným loggerem',
  'solid.error.useAccordionOutsideProvider':
    'Komponenty Accordion musí být použity uvnitř Accordion',
  'solid.error.useToastOutsideProvider': 'useToast musí být použit uvnitř ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider musí být použit uvnitř ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musí být použit v rámci WorkspaceProvider.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider musí být použit v rámci EditorProvider.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider musí být použit v rámci PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient musí být použit v rámci AuthProvider.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient musí být použit v rámci HttpProvider.',
  'solid.error.unsupportedMethod': 'Nepodporovaná metoda: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider musí být použit v rámci LoggerProvider',
  'solid.error.oauthFailed': 'Přihlášení přes OAuth se nezdařilo',
  'solid.error.useRouterOutsideProvider':
    'useRouterInstance musí být použita v rámci RouterProvider.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider musí být použit v rámci StateProvider.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider musí být použit v rámci StorageProvider.',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider musí být použit v rámci ThemeProvider',
}
