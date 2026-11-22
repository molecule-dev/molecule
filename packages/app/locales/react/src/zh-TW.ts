import type { ReactTranslations } from './types.js'

/** React translations for Chinese (Traditional). */
export const zhTW: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'Accordion 元件必須在 Accordion 內使用',
  'react.error.useAuthOutsideProvider': 'useAuthClient 必須在 AuthProvider 內使用',
  'react.error.useChatOutsideProvider': 'useChatProvider 必須在 ChatProvider 內使用',
  'react.error.useEditorOutsideProvider': 'useEditorProvider 必須在 EditorProvider 內使用',
  'react.error.useHttpOutsideProvider': 'useHttpClient 必須在 HttpProvider 內使用',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider 必須在 LoggerProvider 內使用',
  'react.error.usePreviewOutsideProvider': 'usePreviewProvider 必須在 PreviewProvider 內使用',
  'react.error.useRouterOutsideProvider':
    '這裡沒有路由器。請從應用程式的路由綁定中掛載一個路由器元件（例如`@molecule/app-routing-react-router`中的`BrowserRouter`），或將`router`傳遞給`MoleculeProvider`。如果應用程式已經這樣做了，則其路由綁定版本低於此綁定：請更新它（`npm install @molecule/app-routing-react-router@latest`）。',
  'react.error.noRoutedView':
    '此路由綁定中沒有要渲染的路由視圖：請將頁面作為子元素傳遞。如果應用程式路由使用`@molecule/app-routing-react-router` `npm install @molecule/app-routing-react-router@latest`）。',
  'react.error.useStoreOutsideProvider': 'useStateProvider 必須在 StateProvider 內使用',
  'react.error.useStorageOutsideProvider': 'useStorageProvider 必須在 StorageProvider 內使用',
  'react.error.useThemeOutsideProvider': 'useThemeProvider 必須在 ThemeProvider 內使用',
  'react.error.useToastOutsideProvider': 'useToast 必須在 ToastProvider 內使用',
  'react.error.useWorkspaceOutsideProvider': 'useWorkspaceProvider 必須在 WorkspaceProvider 內使用',
  'react.error.unsupportedMethod': '不支援的方法: {{method}}',
  'react.error.oauthFailed': 'OAuth 登入失敗',
}
