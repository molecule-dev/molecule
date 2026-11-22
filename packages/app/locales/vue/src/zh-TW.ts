import type { VueTranslations } from './types.js'

/** Vue translations for Chinese (Traditional). */
export const zhTW: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    '這裡沒有路由器。將應用程式包裝在路由綁定（`@molecule/app-routing-vue-router`）的`MoleculeRouterProvider`中，或將`router`傳遞給`moleculePlugin`。',
  'vue.error.noRoutedView': '此路由綁定沒有要渲染的路由視圖：請將頁面作為子頁面傳遞。',
  'vue.error.useStoreOutsideProvider': 'useStateProvider 必須在 StateProvider 內使用',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider 必須在 ThemeProvider 內使用',
  'vue.error.useAuthOutsideProvider': 'useAuthClient 必須在 AuthProvider 內使用',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider 必須在 StorageProvider 內使用',
  'vue.error.useHttpOutsideProvider': 'useHttpClient 必須在 HttpProvider 內使用',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider 必須在 LoggerProvider 內使用',
  'vue.error.useToastOutsideProvider': 'useToast 必須在 ToastProvider 內使用',
  'vue.error.unsupportedMethod': '不支援的方法: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider 必須在 ChatProvider 內使用',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider 必須在 EditorProvider 中使用。',
  'vue.error.oauthFailed': 'OAuth登入失敗',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider 必須在 PreviewProvider 中使用',
  'vue.error.useWorkspaceOutsideProvider': 'useWorkspaceProvider 必須在 WorkspaceProvider 中使用。',
}
