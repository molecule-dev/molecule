import type { AngularTranslations } from './types.js'

/** Angular translations for Serbian. */
export const sr: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider мора да се користи унутар ChatProvider-а',
  'angular.error.useAuthOutsideProvider': 'useAuthClient мора се користити унутар AuthProvider-а',
  'angular.error.oauthFailed': 'Пријављивање путем OAuth-а није успело',
  'angular.error.unsupportedMethod': 'Неподржана метода: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider мора се користити унутар StateProvider-а',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider мора да се користи унутар EditorProvider-а',
  'angular.error.useHttpOutsideProvider': 'useHttpClient мора да се користи унутар HttpProvider-а',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи унутар LoggerProvider-а',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider мора да се користи унутар PreviewProvider-а',
  'angular.error.useRouterOutsideProvider':
    'Овде нема рутера. Додајте `provideMoleculeRouter()` из везе рутирања (`@molecule/app-routing-angular-router`) добављачима апликације, након Angular-овог `provideRouter(routes)`, или проследите `router` до `provideMolecule`. Ако апликација већ ово ради, њена веза рутирања је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Ова веза рутирања нема усмерен приказ за приказивање овде: уместо тога проследите страницу као потомке. Ако апликација рутира са `@molecule/app-routing-angular-router`, та веза је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи унутар StorageProvider-а',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider мора да се користи унутар ThemeProvider-а',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора да се користи унутар WorkspaceProvider-а',
}
