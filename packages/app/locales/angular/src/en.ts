import type { AngularTranslations } from './types.js'

/** Angular translations for English. */
export const en: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider must be used within a ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient must be used within an AuthProvider',
  'angular.error.useEditorOutsideProvider':
    'useEditorProvider must be used within an EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient must be used within an HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider must be used within a LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider must be used within a PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    "No router here. Add `provideMoleculeRouter()` from the routing bond (`@molecule/app-routing-angular-router`) to the app's providers, after Angular's `provideRouter(routes)`, or pass `router` to `provideMolecule`. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    'This routing bond has no routed view to render here: pass the page as children instead. If the app routes with `@molecule/app-routing-angular-router`, that bond is older than this binding: update it (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider must be used within a StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider must be used within a ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider must be used within a WorkspaceProvider',
  'angular.error.oauthFailed': 'OAuth login failed',
  'angular.error.unsupportedMethod': 'Unsupported method: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider must be used within a StateProvider',
}
