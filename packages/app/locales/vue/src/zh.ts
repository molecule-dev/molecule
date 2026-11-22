import type { VueTranslations } from './types.js'

/** Vue translations for Chinese. */
export const zh: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    '这里没有路由器。将应用程序包装在路由绑定（`@molecule/app-routing-vue-router`）的`MoleculeRouterProvider`中，或者将`router`传递给`moleculePlugin`。',
  'vue.error.noRoutedView': '此路由绑定没有要渲染的路由视图：请将页面作为子页面传递。',
  'vue.error.useStoreOutsideProvider': 'useStateProvider 必须在 StateProvider 内使用',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider 必须在 ThemeProvider 内使用',
  'vue.error.useAuthOutsideProvider': 'useAuthClient 必须在 AuthProvider 内使用',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider 必须在 StorageProvider 内使用',
  'vue.error.useHttpOutsideProvider': 'useHttpClient 必须在 HttpProvider 内使用',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider 必须在 LoggerProvider 内使用',
  'vue.error.useToastOutsideProvider': 'useToast 必须在 ToastProvider 内使用',
  'vue.error.unsupportedMethod': '不支持的方法: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider 必须在 ChatProvider 内使用',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider 必须在 EditorProvider 中使用。',
  'vue.error.oauthFailed': 'OAuth登录失败',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider 必须在 PreviewProvider 中使用',
  'vue.error.useWorkspaceOutsideProvider': 'useWorkspaceProvider 必须在 WorkspaceProvider 中使用。',
}
