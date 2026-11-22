import type { AngularTranslations } from './types.js'

/** Angular translations for Croatian. */
export const hr: AngularTranslations = {
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
    'Ovdje nema usmjerivača. Dodajte `provideMoleculeRouter()` iz veze usmjeravanja (`@molecule/app-routing-angular-router`) pružateljima aplikacije, nakon Angularovog `provideRouter(routes)`, ili proslijedite `router` `provideMolecule`. Ako aplikacija to već radi, njena veza usmjeravanja je starija od ove veze: ažurirajte je (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Ova veza usmjeravanja nema usmjerni prikaz za prikaz ovdje: umjesto toga proslijedite stranicu kao djecu. Ako se aplikacija usmjerava s `@molecule/app-routing-angular-router`, ta je veza starija od ove veze: ažurirajte je (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider se mora koristiti unutar StorageProvider-a',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider se mora koristiti unutar ThemeProvider-a',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora koristiti unutar WorkspaceProvider-a',
}
