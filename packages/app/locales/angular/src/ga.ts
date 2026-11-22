import type { AngularTranslations } from './types.js'

/** Angular translations for Irish. */
export const ga: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'Ní mór useChatProvider a úsáid laistigh de ChatProvider',
  'angular.error.useAuthOutsideProvider': 'Ní mór useAuthClient a úsáid laistigh de AuthProvider',
  'angular.error.oauthFailed': 'Theip ar logáil isteach OAuth',
  'angular.error.unsupportedMethod': 'Modh gan tacaíocht: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'Ní mór useStateProvider a úsáid laistigh de StateProvider',

  'angular.error.useEditorOutsideProvider':
    'Ní mór useEditorProvider a úsáid laistigh de EditorProvider',
  'angular.error.useHttpOutsideProvider': 'Ní mór useHttpClient a úsáid laistigh de HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'Ní mór useLoggerProvider a úsáid laistigh de LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'Ní mór usePreviewProvider a úsáid laistigh de PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Níl aon ródaire anseo. Cuir `provideMoleculeRouter()` ón nasc ródaithe (`@molecule/app-routing-angular-router`) le soláthraithe an aip, i ndiaidh `provideRouter(routes)` Angular, nó cuir `router` chuig `provideMolecule`. Má dhéanann an aip é seo cheana féin, tá a nasc ródaithe níos sine ná an ceangal seo: nuashraigh é (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Níl aon radharc ródaithe ag an nasc ródaithe seo le rindreáil anseo: cuir an leathanach ar aghaidh mar pháistí ina ionad. Má ródaíonn an aip le `@molecule/app-routing-angular-router`, tá an nasc sin níos sine ná an ceangal seo: nuashraigh é (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'Ní mór useStorageProvider a úsáid laistigh de StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'Ní mór useThemeProvider a úsáid laistigh de ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'Ní mór useWorkspaceProvider a úsáid laistigh de WorkspaceProvider',
}
