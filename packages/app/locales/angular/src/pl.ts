import type { AngularTranslations } from './types.js'

/** Angular translations for Polish. */
export const pl: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider musi być używany wewnątrz ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient musi być używany w ramach AuthProvider',
  'angular.error.oauthFailed': 'Nieudane logowanie OAuth',
  'angular.error.unsupportedMethod': 'Nieobsługiwana metoda: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider musi być używany w obrębie StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider musi być używany wewnątrz EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient musi być używany wewnątrz HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider musi być używany wewnątrz LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider musi być używany wewnątrz PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Brak routera. Dodaj `provideMoleculeRouter()` z powiązania routingu (`@molecule/app-routing-angular-router`) do dostawców aplikacji, po `provideRouter(routes)` Angulara lub przekaż `router` do `provideMolecule`.',
  'angular.error.noRoutedView':
    'To powiązanie routingu nie ma widoku routingu do renderowania w tym miejscu: zamiast tego przekaż stronę jako stronę potomną.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider musi być używany wewnątrz StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider musi być używany wewnątrz ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musi być używany wewnątrz WorkspaceProvider',
}
