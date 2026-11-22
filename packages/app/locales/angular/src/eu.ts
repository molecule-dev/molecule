import type { AngularTranslations } from './types.js'

/** Angular translations for Basque. */
export const eu: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider ChatProvider baten barruan erabili behar da',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient AuthProvider baten barruan erabili behar da',
  'angular.error.oauthFailed': 'OAuth saioa hastea huts egin du',
  'angular.error.unsupportedMethod': 'Metodo bateraezina: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider StateProvider baten barruan erabili behar da',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider baten barruan erabili behar da',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient HttpProvider baten barruan erabili behar da',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider baten barruan erabili behar da',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider baten barruan erabili behar da',
  'angular.error.useRouterOutsideProvider':
    'Ez dago bideratzailerik hemen. Gehitu `provideMoleculeRouter()` bideratze loturatik (`@molecule/app-routing-angular-router`) aplikazioaren hornitzaileetara, Angular-en `provideRouter(routes)` ondoren, edo pasa `router` `provideMolecule` ri. Aplikazioak dagoeneko egiten badu hau, bere bideratze lotura lotura hau baino zaharragoa da: eguneratu (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Bideratze-lotura honek ez du hemen errendatzeko bideratutako ikuspegirik: pasa orrialdea seme-alaba gisa. Aplikazioak `@molecule/app-routing-angular-router` rekin bideratzen badu, lotura hori lotura hau baino zaharragoa da: eguneratu (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider baten barruan erabili behar da',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider baten barruan erabili behar da',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider baten barruan erabili behar da',
}
