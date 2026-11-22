import type { AngularTranslations } from './types.js'

/** Angular translations for Hungarian. */
export const hu: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'A useChatProvider-t ChatProvider-en belül kell használni',
  'angular.error.useAuthOutsideProvider':
    'A useAuthClient-et egy AuthProvider-en belül kell használni.',
  'angular.error.oauthFailed': 'OAuth bejelentkezés sikertelen',
  'angular.error.unsupportedMethod': 'Nem támogatott metódus: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'A useStateProvider paramétert egy StateProvider paraméteren belül kell használni.',

  'angular.error.useEditorOutsideProvider':
    'A useEditorProvider-t EditorProvider-en belül kell használni',
  'angular.error.useHttpOutsideProvider': 'A useHttpClient-et HttpProvider-en belül kell használni',
  'angular.error.useLoggerOutsideProvider':
    'A useLoggerProvider-t LoggerProvider-en belül kell használni',
  'angular.error.usePreviewOutsideProvider':
    'A usePreviewProvider-t PreviewProvider-en belül kell használni',
  'angular.error.useRouterOutsideProvider':
    'Nincs itt router. Add hozzá `provideMoleculeRouter()` függvényt az útvonalválasztási kötelékből (`@molecule/app-routing-angular-router`) az alkalmazás szolgáltatóihoz, az Angular `provideRouter(routes)` után, vagy add át `router` a `provideMolecule` nak.',
  'angular.error.noRoutedView':
    'Ennek az útvonalválasztási kötvénynek nincs útvonalnézete, amelyet itt megjeleníthetne: ehelyett adja át az oldalt gyermekként.',
  'angular.error.useStorageOutsideProvider':
    'A useStorageProvider-t StorageProvider-en belül kell használni',
  'angular.error.useThemeOutsideProvider':
    'A useThemeProvider-t ThemeProvider-en belül kell használni',
  'angular.error.useWorkspaceOutsideProvider':
    'A useWorkspaceProvider-t WorkspaceProvider-en belül kell használni',
}
