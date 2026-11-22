import type { ReactTranslations } from './types.js'

/** React translations for Chinese. */
export const zh: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'Accordion 组件必须在 Accordion 内使用',
  'react.error.useAuthOutsideProvider': 'useAuthClient 必须在 AuthProvider 内使用',
  'react.error.useChatOutsideProvider': 'useChatProvider 必须在 ChatProvider 内使用',
  'react.error.useEditorOutsideProvider': 'useEditorProvider 必须在 EditorProvider 内使用',
  'react.error.useHttpOutsideProvider': 'useHttpClient 必须在 HttpProvider 内使用',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider 必须在 LoggerProvider 内使用',
  'react.error.usePreviewOutsideProvider': 'usePreviewProvider 必须在 PreviewProvider 内使用',
  'react.error.useRouterOutsideProvider':
    '这里没有路由器。从应用程序的路由绑定中挂载一个路由器组件（来自`@molecule/app-routing-react-router` `BrowserRouter`），或者将`router`传递给`MoleculeProvider`。',
  'react.error.noRoutedView': '此路由绑定没有要渲染的路由视图：请将页面作为子页面传递。',
  'react.error.useStoreOutsideProvider': 'useStateProvider 必须在 StateProvider 内使用',
  'react.error.useStorageOutsideProvider': 'useStorageProvider 必须在 StorageProvider 内使用',
  'react.error.useThemeOutsideProvider': 'useThemeProvider 必须在 ThemeProvider 内使用',
  'react.error.useToastOutsideProvider': 'useToast 必须在 ToastProvider 内使用',
  'react.error.useWorkspaceOutsideProvider': 'useWorkspaceProvider 必须在 WorkspaceProvider 内使用',
  'react.error.unsupportedMethod': '不支持的方法: {{method}}',
  'react.error.oauthFailed': 'OAuth 登录失败',
}
