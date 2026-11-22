import type { AngularTranslations } from './types.js'

/** Angular translations for Azerbaijani. */
export const az: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider ChatProvider daxilində istifadə edilməlidir',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient AuthProvider daxilində istifadə olunmalıdır',
  'angular.error.oauthFailed': 'OAuth girişi uğursuz oldu',
  'angular.error.unsupportedMethod': 'Dəstəklənməyən metod: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider, StateProvider daxilində istifadə olunmalıdır',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider daxilində istifadə edilməlidir',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient HttpProvider daxilində istifadə edilməlidir',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider daxilində istifadə edilməlidir',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider daxilində istifadə edilməlidir',
  'angular.error.useRouterOutsideProvider':
    'Burada router yoxdur. Angular-ın `provideRouter(routes)`-dən sonra marşrutlaşdırma bağından (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` tətbiqin provayderlərinə əlavə edin və ya `router` `provideMolecule` yə ötürün.',
  'angular.error.noRoutedView':
    'Bu marşrutlaşdırma bondunun burada göstərmək üçün marşrutlaşdırılmış görünüş yoxdur: səhifəni uşaq kimi ötürün.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider daxilində istifadə edilməlidir',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider daxilində istifadə edilməlidir',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider daxilində istifadə edilməlidir',
}
