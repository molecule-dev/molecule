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
    'Тут няма маршрутызатара. Дадайце `provideMoleculeRouter()` з маршрутызацыйнай сувязі (`@molecule/app-routing-angular-router`) да пастаўшчыкоў праграмы пасля `provideRouter(routes)` з Angular або перадайце `router` у `provideMolecule`. Калі праграма ўжо гэта робіць, яе маршрутызацыйная сувязь старэйшая за гэту прывязку: абнавіце яе (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Гэтая прывязка маршрутызацыі не мае маршрутызаванага прадстаўлення для рэндэрынгу: замест гэтага перадайце старонку як даччыныя элементы. Калі праграма маршрутызуе з `@molecule/app-routing-angular-router`, гэтая прывязка старэйшая за гэту прывязку: абнавіце яе (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider павінен выкарыстоўвацца ўнутры StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider павінен выкарыстоўвацца ўнутры ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider павінен выкарыстоўвацца ўнутры WorkspaceProvider',
}
