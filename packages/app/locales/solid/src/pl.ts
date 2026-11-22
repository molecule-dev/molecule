import type { SolidTranslations } from './types.js'

/** Solid translations for Polish. */
export const pl: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym stanem',
  'solid.error.authOutsideProvider':
    'getAuthClient musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym uwierzytelnianiem',
  'solid.error.themeOutsideProvider':
    'getThemeProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym motywem',
  'solid.error.routerOutsideProvider':
    'getRouter musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym routerem',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym przechowywaniem',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym loggerem',
  'solid.error.useAccordionOutsideProvider':
    'Komponenty Accordion muszą być użyte wewnątrz Accordion',
  'solid.error.useToastOutsideProvider': 'useToast musi być użyty wewnątrz ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider musi być używany wewnątrz ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musi być używany w WorkspaceProvider',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider musi być używany w ramach EditorProvider',
  'solid.error.usePreviewOutsideProvider': 'usePreviewProvider musi być używany w PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient musi być używany w ramach AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient musi być używany w ramach HttpProvider',
  'solid.error.unsupportedMethod': 'Nieobsługiwana metoda: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider musi być używany w LoggerProvider',
  'solid.error.oauthFailed': 'Nieudane logowanie OAuth',
  'solid.error.useRouterOutsideProvider':
    'Brak routera. Użyj `MoleculeRouterProvider` z powiązania routingowego (`@molecule/app-routing-solid-router`) jako `root` routera lub przekaż `router` do `MoleculeProvider`. Jeśli aplikacja już to robi, jej powiązanie routingowe jest starsze niż to powiązanie: zaktualizuj je (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Brak widoku trasy. Solid Router przypisuje komponentowi trasy jego zagnieżdżoną trasę jako `props.children`: użyj tego jako `component` trasy lub przekaż stronę jako elementy podrzędne.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider musi być używany w obrębie StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider musi być używany w ramach StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider musi być używany w ramach ThemeProvider',
}
