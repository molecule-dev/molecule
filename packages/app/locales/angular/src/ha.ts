import type { AngularTranslations } from './types.js'

/** Angular translations for Hausa. */
export const ha: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'Dole ne a yi amfani da useChatProvider a cikin ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'Dole ne a yi amfani da useAuthClient a cikin Mai Ba da Izini',
  'angular.error.oauthFailed': 'Shiga OAuth ya gaza',
  'angular.error.unsupportedMethod': 'Hanyar da ba ta da tallafi: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'Dole ne a yi amfani da useStateProvider a cikin Mai Ba da Lamuni na Jiha',

  'angular.error.useEditorOutsideProvider':
    'Dole ne a yi amfani da useEditorProvider a cikin EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'Dole ne a yi amfani da useHttpClient a cikin HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'Dole ne a yi amfani da useLoggerProvider a cikin LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'Dole ne a yi amfani da usePreviewProvider a cikin PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    "Babu na'urar sadarwa a nan. Ƙara `provideMoleculeRouter()` daga haɗin hanyar sadarwa (`@molecule/app-routing-angular-router`) zuwa ga masu samar da manhajar, bayan `provideRouter(routes)` na Angular, ko kuma wuce `router` zuwa `provideMolecule`. Idan manhajar ta riga ta yi haka, haɗin hanyar sadarwa ta girmi wannan haɗin: sabunta shi (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    "Wannan haɗin hanyar sadarwa ba shi da wani ra'ayi da za a nuna a nan: wuce shafin a matsayin yara maimakon haka. Idan manhajar ta yi tafiya tare da `@molecule/app-routing-angular-router`, wannan haɗin ya girmi wannan haɗin: sabunta shi (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.useStorageOutsideProvider':
    'Dole ne a yi amfani da useStorageProvider a cikin StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'Dole ne a yi amfani da useThemeProvider a cikin ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'Dole ne a yi amfani da useWorkspaceProvider a cikin WorkspaceProvider',
}
