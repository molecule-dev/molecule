import type { SolidTranslations } from './types.js'

/** Solid translations for Hungarian. */
export const hu: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider -t egy MoleculeProvider-en belül kell használni konfigurált állapottal',
  'solid.error.authOutsideProvider':
    'getAuthClient -t egy MoleculeProvider-en belül kell használni konfigurált hitelesítéssel',
  'solid.error.themeOutsideProvider':
    'getThemeProvider -t egy MoleculeProvider-en belül kell használni konfigurált témával',
  'solid.error.routerOutsideProvider':
    'getRouter -t egy MoleculeProvider-en belül kell használni konfigurált útválasztóval',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider -t egy MoleculeProvider-en belül kell használni konfigurált i18n-nel',
  'solid.error.httpOutsideProvider':
    'getHttpClient -t egy MoleculeProvider-en belül kell használni konfigurált HTTP-vel',
  'solid.error.storageOutsideProvider':
    'getStorageProvider -t egy MoleculeProvider-en belül kell használni konfigurált tárolóval',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider -t egy MoleculeProvider-en belül kell használni konfigurált naplózóval',
  'solid.error.useAccordionOutsideProvider':
    'Az Accordion komponenseket egy Accordion-on belül kell használni',
  'solid.error.useToastOutsideProvider': 'useToast -t egy ToastProvider-en belül kell használni',
  'solid.error.useChatOutsideProvider': 'A useChatProvider-t ChatProvider-en belül kell használni',
  'solid.error.useWorkspaceOutsideProvider':
    'A useWorkspaceProvider paramétert egy WorkspaceProvider-en belül kell használni.',
  'solid.error.useEditorOutsideProvider':
    'A useEditorProvider paramétert egy EditorProvider-en belül kell használni.',
  'solid.error.usePreviewOutsideProvider':
    'A usePreviewProvider paramétert PreviewProvider-en belül kell használni.',
  'solid.error.useAuthOutsideProvider':
    'A useAuthClient-et egy AuthProvider-en belül kell használni.',
  'solid.error.useHttpOutsideProvider':
    'A useHttpClient függvényt egy HttpProvider-en belül kell használni.',
  'solid.error.unsupportedMethod': 'Nem támogatott metódus: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'A useLoggerProvider paramétert egy LoggerProvider-en belül kell használni.',
  'solid.error.oauthFailed': 'OAuth bejelentkezés sikertelen',
  'solid.error.useRouterOutsideProvider':
    'Nincs itt router. Használd `MoleculeRouterProvider` a routing bondból (`@molecule/app-routing-solid-router`) a router `root` ként, vagy add át `router` a `MoleculeProvider` nek. Ha az alkalmazás már ezt teszi, akkor a routing bondja régebbi, mint ez a kötés: frissítsd (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Nincs itt útvonalnézet. A Solid Router egy útvonal komponensének beágyazott útvonalát adja meg `props.children` néven: ezt használhatod egy útvonal `component`, vagy átadhatod az oldalt gyermekként.',
  'solid.error.useStoreOutsideProvider':
    'A useStateProvider paramétert egy StateProvider paraméteren belül kell használni.',
  'solid.error.useStorageOutsideProvider':
    'A useStorageProvider paramétert egy StorageProvider paraméteren belül kell használni.',
  'solid.error.useThemeOutsideProvider':
    'A useThemeProvider-t egy ThemeProvider-en belül kell használni.',
}
