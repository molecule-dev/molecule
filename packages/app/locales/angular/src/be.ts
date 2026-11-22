import type { AngularTranslations } from './types.js'

/** Angular translations for Belarusian. */
export const be: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider павінен выкарыстоўвацца ўнутры ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient павінен выкарыстоўвацца ўнутры AuthProvider',
  'angular.error.oauthFailed': 'Памылка ўваходу праз OAuth',
  'angular.error.unsupportedMethod': 'Непадтрымоўваны метад: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider павінен выкарыстоўвацца ўнутры StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider павінен выкарыстоўвацца ўнутры EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient павінен выкарыстоўвацца ўнутры HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider павінен выкарыстоўвацца ўнутры LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider павінен выкарыстоўвацца ўнутры PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Тут няма маршрутызатара. Дадайце `provideMoleculeRouter()` з маршрутызацыйнай сувязі (`@molecule/app-routing-angular-router`) да пастаўшчыкоў праграмы пасля `provideRouter(routes)` Angular або перадайце `router` у `provideMolecule`.',
  'angular.error.noRoutedView':
    'Гэтая маршрутная сувязь не мае маршрутнага выгляду для рэндэрынгу: замест гэтага перадайце старонку як даччыныя элементы.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider павінен выкарыстоўвацца ўнутры StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider павінен выкарыстоўвацца ўнутры ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider павінен выкарыстоўвацца ўнутры WorkspaceProvider',
}
