import type { AngularTranslations } from './types.js'

/** Angular translations for Maltese. */
export const mt: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider irid jintuża ġewwa ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient irid jintuża fi ħdan AuthProvider',
  'angular.error.oauthFailed': 'Il-login tal-OAuth falla',
  'angular.error.unsupportedMethod': 'Metodu mhux appoġġjat: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider irid jintuża fi ħdan StateProvider',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider irid jintuża ġewwa EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient irid jintuża ġewwa HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider irid jintuża ġewwa LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider irid jintuża ġewwa PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    "M'hemm l-ebda router hawn. Żid `provideMoleculeRouter()` mir-rabta tar-routing (`@molecule/app-routing-angular-router`) mal-fornituri tal-app, wara `provideRouter(routes)` ta' Angular, jew għaddi `router` lil `provideMolecule`. Jekk l-app diġà tagħmel dan, ir-rabta tar-routing tagħha hija eqdem minn din ir-rabta: aġġornaha (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    "Din ir-rabta tar-rottaġġ m'għandhiex veduta rottata biex tirrendi hawn: għaddi l-paġna bħala tfal minflok. Jekk l-app tirrotta bi `@molecule/app-routing-angular-router`, dik ir-rabta hija eqdem minn din ir-rabta: aġġornaha (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider irid jintuża ġewwa StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider irid jintuża ġewwa ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider irid jintuża ġewwa WorkspaceProvider',
}
