import type { SolidTranslations } from './types.js'

/** Solid translations for German. */
export const de: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Zustand verwendet werden',
  'solid.error.authOutsideProvider':
    'getAuthClient muss innerhalb eines MoleculeProvider mit konfiguriertem Authentifizierung verwendet werden',
  'solid.error.themeOutsideProvider':
    'getThemeProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Theme verwendet werden',
  'solid.error.routerOutsideProvider':
    'getRouter muss innerhalb eines MoleculeProvider mit konfiguriertem Router verwendet werden',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider muss innerhalb eines MoleculeProvider mit konfiguriertem i18n verwendet werden',
  'solid.error.httpOutsideProvider':
    'getHttpClient muss innerhalb eines MoleculeProvider mit konfiguriertem HTTP verwendet werden',
  'solid.error.storageOutsideProvider':
    'getStorageProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Speicher verwendet werden',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Logger verwendet werden',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-Komponenten müssen innerhalb eines Accordion verwendet werden',
  'solid.error.useToastOutsideProvider':
    'useToast muss innerhalb eines ToastProvider verwendet werden',
  'solid.error.useChatOutsideProvider':
    'useChatProvider muss innerhalb eines ChatProvider verwendet werden',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider muss innerhalb eines WorkspaceProviders verwendet werden.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider muss innerhalb eines EditorProviders verwendet werden.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider muss innerhalb eines PreviewProvider verwendet werden.',
  'solid.error.useAuthOutsideProvider':
    'useAuthClient muss innerhalb eines AuthProviders verwendet werden.',
  'solid.error.useHttpOutsideProvider':
    'useHttpClient muss innerhalb eines HttpProviders verwendet werden.',
  'solid.error.unsupportedMethod': 'Nicht unterstützte Methode: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider muss innerhalb eines LoggerProviders verwendet werden.',
  'solid.error.oauthFailed': 'OAuth-Anmeldung fehlgeschlagen',
  'solid.error.useRouterOutsideProvider':
    'Hier ist kein Router vorhanden. Verwenden Sie `MoleculeRouterProvider` aus dem Routing-Bond (`@molecule/app-routing-solid-router`) als `root` des Routers oder übergeben Sie `router` an `MoleculeProvider`. Falls die App dies bereits tut, ist ihr Routing-Bond älter als diese Bindung: Aktualisieren Sie ihn (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Hier gibt es keine geroutete Ansicht. Solid Router übergibt die verschachtelte Route einer Routenkomponente als `props.children`: Verwenden Sie dies als `component` einer Route oder übergeben Sie die Seite als Kinder.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider muss innerhalb eines StateProviders verwendet werden.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider muss innerhalb eines StorageProviders verwendet werden.',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider muss innerhalb eines ThemeProviders verwendet werden.',
}
