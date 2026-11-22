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
    'Nincs itt router. Add hozzá `provideMoleculeRouter()` függvénnyel ellátott útvonalválasztási köteléket (`@molecule/app-routing-angular-router`) az alkalmazás szolgáltatóihoz, az Angular `provideRouter(routes)` után, vagy add át `router` függvénnyel ellátott függvényt a `provideMolecule` nak. Ha az alkalmazás már ezt teszi, akkor az útvonalválasztási köteléke régebbi, mint ez a kötés: frissítsd (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Ennek az útvonalválasztási köteléknek nincs útvonalnézete a megjelenítéshez: ehelyett add át az oldalakat gyermekként. Ha az alkalmazás `@molecule/app-routing-angular-router` irányít, akkor ez a kötelék régebbi, mint ez a kötvény: frissítsd (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'A useStorageProvider-t StorageProvider-en belül kell használni',
  'angular.error.useThemeOutsideProvider':
    'A useThemeProvider-t ThemeProvider-en belül kell használni',
  'angular.error.useWorkspaceOutsideProvider':
    'A useWorkspaceProvider-t WorkspaceProvider-en belül kell használni',
}
