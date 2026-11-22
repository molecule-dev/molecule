import type { AngularTranslations } from './types.js'

/** Angular translations for Latvian. */
export const lv: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider jāizmanto ChatProvider ietvaros',
  'angular.error.useAuthOutsideProvider': 'useAuthClient ir jāizmanto AuthProvider ietvaros.',
  'angular.error.oauthFailed': 'OAuth pieteikšanās neizdevās.',
  'angular.error.unsupportedMethod': 'Neatbalstīta metode: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider ir jāizmanto StateProvider ietvaros.',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider jāizmanto EditorProvider ietvaros',
  'angular.error.useHttpOutsideProvider': 'useHttpClient jāizmanto HttpProvider ietvaros',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider jāizmanto LoggerProvider ietvaros',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider jāizmanto PreviewProvider ietvaros',
  'angular.error.useRouterOutsideProvider':
    'Šeit nav maršrutētāja. Pievienojiet `provideMoleculeRouter()` no maršrutēšanas saites (`@molecule/app-routing-angular-router`) lietotnes nodrošinātājiem pēc Angular `provideRouter(routes)` vai nododiet `router` funkcijai `provideMolecule`.',
  'angular.error.noRoutedView':
    'Šai maršrutēšanas saitei nav maršrutēta skata, ko šeit atveidot: tā vietā nododiet lapu kā apakšlapas.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider jāizmanto StorageProvider ietvaros',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider jāizmanto ThemeProvider ietvaros',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider jāizmanto WorkspaceProvider ietvaros',
}
