import type { AngularTranslations } from './types.js'

/** Angular translations for Icelandic. */
export const is: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider verður að nota innan ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient verður að nota innan AuthProvider',
  'angular.error.oauthFailed': 'OAuth innskráning mistókst',
  'angular.error.unsupportedMethod': 'Óstudd aðferð: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider verður að vera notaður innan StateProvider',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider verður að nota innan EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient verður að nota innan HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider verður að nota innan LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider verður að nota innan PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Engin leið hér. Bætið við `provideMoleculeRouter()` úr leiðartengingunni (`@molecule/app-routing-angular-router`) við veitendur forritsins, á eftir `provideRouter(routes)` í Angular, eða sendið `router` til `provideMolecule`. Ef forritið gerir þetta nú þegar, þá er leiðartenging þess eldra en þessi tenging: uppfærið hana (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Þessi leiðartenging hefur enga leiðarsýn til að birta hér: sendið síðuna sem undirsíður í staðinn. Ef appið leiðir með `@molecule/app-routing-angular-router`, þá er sú tenging eldri en þessi tenging: uppfærið hana (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider verður að nota innan StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider verður að nota innan ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider verður að nota innan WorkspaceProvider',
}
