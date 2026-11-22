import type { SolidTranslations } from './types.js'

/** Solid translations for Swedish. */
export const sv: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider måste användas inom en MoleculeProvider med konfigurerad tillstånd',
  'solid.error.authOutsideProvider':
    'getAuthClient måste användas inom en MoleculeProvider med konfigurerad autentisering',
  'solid.error.themeOutsideProvider':
    'getThemeProvider måste användas inom en MoleculeProvider med konfigurerad tema',
  'solid.error.routerOutsideProvider':
    'getRouter måste användas inom en MoleculeProvider med konfigurerad router',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider måste användas inom en MoleculeProvider med konfigurerad i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient måste användas inom en MoleculeProvider med konfigurerad HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider måste användas inom en MoleculeProvider med konfigurerad lagring',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider måste användas inom en MoleculeProvider med konfigurerad loggning',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponenter måste användas inom en Accordion',
  'solid.error.useToastOutsideProvider': 'useToast måste användas inom en ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider måste användas inom en ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider måste användas inom en WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider måste användas inom en EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider måste användas inom en PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient måste användas inom en AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient måste användas inom en HttpProvider',
  'solid.error.unsupportedMethod': 'Metod som inte stöds: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider måste användas inom en LoggerProvider',
  'solid.error.oauthFailed': 'OAuth-inloggning misslyckades',
  'solid.error.useRouterOutsideProvider':
    'Ingen router här. Använd `MoleculeRouterProvider` från routingbindningen (`@molecule/app-routing-solid-router`) som routerns `root`, eller skicka `router` till `MoleculeProvider`. Om appen redan gör detta är dess routingbindning äldre än denna bindning: uppdatera den (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Ingen routad vy här. Solid Router ger en rutts komponent dess kapslade rutt som `props.children`: använd detta som en rutts `component`, eller skicka sidan som barn.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider måste användas inom en StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider måste användas inom en StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider måste användas inom en ThemeProvider',
}
