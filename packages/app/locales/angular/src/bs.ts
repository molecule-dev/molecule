import type { AngularTranslations } from './types.js'

/** Angular translations for Bosnian. */
export const bs: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider se mora koristiti unutar ChatProvider-a',
  'angular.error.useAuthOutsideProvider': 'useAuthClient se mora koristiti unutar AuthProvider-a',
  'angular.error.oauthFailed': 'Prijava putem OAuth-a nije uspjela',
  'angular.error.unsupportedMethod': 'Nepodržana metoda: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider se mora koristiti unutar StateProvider-a',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider se mora koristiti unutar EditorProvider-a',
  'angular.error.useHttpOutsideProvider': 'useHttpClient se mora koristiti unutar HttpProvider-a',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider se mora koristiti unutar LoggerProvider-a',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider se mora koristiti unutar PreviewProvider-a',
  'angular.error.useRouterOutsideProvider':
    'Ovdje nema rutera. Dodajte `provideMoleculeRouter()` iz veze usmjeravanja (`@molecule/app-routing-angular-router`) u provajdere aplikacije, nakon Angularovog `provideRouter(routes)`, ili proslijedite `router` u `provideMolecule`.',
  'angular.error.noRoutedView':
    'Ova veza usmjeravanja nema usmjereni prikaz za renderiranje ovdje: umjesto toga, proslijedite stranicu kao potomke.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider se mora koristiti unutar StorageProvider-a',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider se mora koristiti unutar ThemeProvider-a',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora koristiti unutar WorkspaceProvider-a',
}
