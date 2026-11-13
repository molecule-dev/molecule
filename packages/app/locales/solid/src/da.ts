import type { SolidTranslations } from './types.js'

/** Solid translations for Danish. */
export const da: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider skal bruges inden for en MoleculeProvider med tilstand konfigureret',
  'solid.error.authOutsideProvider':
    'getAuthClient skal bruges inden for en MoleculeProvider med godkendelse konfigureret',
  'solid.error.themeOutsideProvider':
    'getThemeProvider skal bruges inden for en MoleculeProvider med tema konfigureret',
  'solid.error.routerOutsideProvider':
    'getRouter skal bruges inden for en MoleculeProvider med router konfigureret',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider skal bruges inden for en MoleculeProvider med i18n konfigureret',
  'solid.error.httpOutsideProvider':
    'getHttpClient skal bruges inden for en MoleculeProvider med HTTP konfigureret',
  'solid.error.storageOutsideProvider':
    'getStorageProvider skal bruges inden for en MoleculeProvider med lager konfigureret',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider skal bruges inden for en MoleculeProvider med log konfigureret',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponenter skal bruges inden for en Accordion',
  'solid.error.useToastOutsideProvider': 'useToast skal bruges inden for en ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider skal bruges inden for en ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider skal bruges inden for en WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider skal bruges i en EditorProvider',
  'solid.error.usePreviewOutsideProvider': 'usePreviewProvider skal bruges i en PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient skal bruges inden for en AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient skal bruges i en HttpProvider',
  'solid.error.unsupportedMethod': 'Ikke-understøttet metode: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider skal bruges inden for en LoggerProvider',
  'solid.error.oauthFailed': 'OAuth-login mislykkedes',
  'solid.error.useRouterOutsideProvider': 'useRouterInstance skal bruges i en RouterProvider',
  'solid.error.useStoreOutsideProvider': 'useStateProvider skal bruges inden for en StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider skal bruges inden for en StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider skal bruges inden for en ThemeProvider',
}
