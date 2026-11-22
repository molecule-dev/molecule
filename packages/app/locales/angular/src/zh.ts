import type { AngularTranslations } from './types.js'

/** Angular translations for Chinese. */
export const zh: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider 必须在 ChatProvider 内使用',
  'angular.error.useAuthOutsideProvider': 'useAuthClient 必须在 AuthProvider 中使用。',
  'angular.error.oauthFailed': 'OAuth登录失败',
  'angular.error.unsupportedMethod': '不支持的方法：{{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider 必须在 StateProvider 中使用。',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider 必须在 EditorProvider 内使用',
  'angular.error.useHttpOutsideProvider': 'useHttpClient 必须在 HttpProvider 内使用',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider 必须在 LoggerProvider 内使用',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider 必须在 PreviewProvider 内使用',
  'angular.error.useRouterOutsideProvider':
    '这里没有路由器。将路由绑定（`@molecule/app-routing-angular-router`）中的`provideMoleculeRouter()`添加到应用程序的 providers 中，在 Angular 的`provideRouter(routes)`之后，或者将`router`传递给`provideMolecule`。',
  'angular.error.noRoutedView': '此路由绑定没有要渲染的路由视图：请将页面作为子页面传递。',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider 必须在 StorageProvider 内使用',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider 必须在 ThemeProvider 内使用',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider 必须在 WorkspaceProvider 内使用',
}
