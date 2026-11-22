import type { SolidTranslations } from './types.js'

/** Solid translations for Norwegian Bokmål. */
export const nb: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider må brukes innenfor en MoleculeProvider med konfigurert tilstand',
  'solid.error.authOutsideProvider':
    'getAuthClient må brukes innenfor en MoleculeProvider med konfigurert autentisering',
  'solid.error.themeOutsideProvider':
    'getThemeProvider må brukes innenfor en MoleculeProvider med konfigurert tema',
  'solid.error.routerOutsideProvider':
    'getRouter må brukes innenfor en MoleculeProvider med konfigurert ruter',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider må brukes innenfor en MoleculeProvider med konfigurert i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient må brukes innenfor en MoleculeProvider med konfigurert HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider må brukes innenfor en MoleculeProvider med konfigurert lagring',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider må brukes innenfor en MoleculeProvider med konfigurert logging',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponenter må brukes innenfor en Accordion',
  'solid.error.useToastOutsideProvider': 'useToast må brukes innenfor en ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider må brukes innenfor en ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider må brukes innenfor en WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider må brukes i en EditorProvider',
  'solid.error.usePreviewOutsideProvider': 'usePreviewProvider må brukes i en PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient må brukes i en AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient må brukes i en HttpProvider',
  'solid.error.unsupportedMethod': 'Metode som ikke støttes: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider må brukes i en LoggerProvider',
  'solid.error.oauthFailed': 'OAuth-pålogging mislyktes',
  'solid.error.useRouterOutsideProvider':
    'Ingen ruter her. Bruk `MoleculeRouterProvider` fra rutingsbindingen (`@molecule/app-routing-solid-router`) som ruterens `root`, eller send `router` til `MoleculeProvider`. Hvis appen allerede gjør dette, er rutingsbindingen eldre enn denne bindingen: oppdater den (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Ingen rutet visning her. Solid Router gir en rutes komponent sin nestede rute som `props.children`: bruk dette som en rutes `component`, eller send siden som barn.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider må brukes i en StateProvider',
  'solid.error.useStorageOutsideProvider': 'useStorageProvider må brukes i en StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider må brukes i en ThemeProvider',
}
