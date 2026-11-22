import type { AngularTranslations } from './types.js'

/** Angular translations for Chinese (Traditional). */
export const zhTW: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider 必須在 ChatProvider 內使用',
  'angular.error.useAuthOutsideProvider': 'useAuthClient 必須在 AuthProvider 中使用。',
  'angular.error.oauthFailed': 'OAuth登入失敗',
  'angular.error.unsupportedMethod': '不支援的方法：{{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider 必須在 StateProvider 中使用。',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider 必須在 EditorProvider 內使用',
  'angular.error.useHttpOutsideProvider': 'useHttpClient 必須在 HttpProvider 內使用',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider 必須在 LoggerProvider 內使用',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider 必須在 PreviewProvider 內使用',
  'angular.error.useRouterOutsideProvider':
    '這裡沒有路由器。將路由綁定（`@molecule/app-routing-angular-router`）中的`provideMoleculeRouter()`加入應用程式的 providers 中，在 Angular 的`provideRouter(routes)`之後，或將`router` `provideMolecule`。',
  'angular.error.noRoutedView': '此路由綁定沒有要渲染的路由視圖：請將頁面作為子頁面傳遞。',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider 必須在 StorageProvider 內使用',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider 必須在 ThemeProvider 內使用',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider 必須在 WorkspaceProvider 內使用',
}
