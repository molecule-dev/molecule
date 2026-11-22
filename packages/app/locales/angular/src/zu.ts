import type { AngularTranslations } from './types.js'

/** Angular translations for Zulu. */
export const zu: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider kumele kusetshenziswe ngaphakathi kwe-ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'i-useAuthClient kumele isetshenziswe ngaphakathi kwe-AuthProvider',
  'angular.error.oauthFailed': 'Ukungena ngemvume kwe-OAuth kwehlulekile',
  'angular.error.unsupportedMethod': 'Indlela engasekelwa: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'i-useStateProvider kumele isetshenziswe ngaphakathi kwe-StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider kumele kusetshenziswe ngaphakathi kwe-EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient kumele kusetshenziswe ngaphakathi kwe-HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider kumele kusetshenziswe ngaphakathi kwe-LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider kumele kusetshenziswe ngaphakathi kwe-PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Ayikho i-router lapha. Engeza `provideMoleculeRouter()` kusuka ku-routing bond (`@molecule/app-routing-angular-router`) kubahlinzeki bohlelo lokusebenza, ngemuva kwe `provideRouter(routes)` ka-Angular, noma udlulisele `router` ku `provideMolecule`. Uma uhlelo lokusebenza seluvele lukwenza lokhu, i-routing bond yalo indala kunalokhu kubopha: yibuyekeze (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Lesi sibopho sokuqondisa asinawo umbono oqondiswe lapha: dlulisa ikhasi njengezingane esikhundleni salokho. Uma uhlelo lokusebenza lusebenzisa i `@molecule/app-routing-angular-router`, leso sibopho sidala kunalesi sibopho: sibuyekeze (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider kumele kusetshenziswe ngaphakathi kwe-StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider kumele kusetshenziswe ngaphakathi kwe-ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider kumele kusetshenziswe ngaphakathi kwe-WorkspaceProvider',
}
