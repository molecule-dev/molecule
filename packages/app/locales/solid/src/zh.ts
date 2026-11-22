import type { SolidTranslations } from './types.js'

/** Solid translations for Chinese. */
export const zh: SolidTranslations = {
  'solid.error.stateOutsideProvider': 'getStateProvider 必须在配置了状态的 MoleculeProvider 内使用',
  'solid.error.authOutsideProvider': 'getAuthClient 必须在配置了认证的 MoleculeProvider 内使用',
  'solid.error.themeOutsideProvider': 'getThemeProvider 必须在配置了主题的 MoleculeProvider 内使用',
  'solid.error.routerOutsideProvider': 'getRouter 必须在配置了路由器的 MoleculeProvider 内使用',
  'solid.error.i18nOutsideProvider': 'getI18nProvider 必须在配置了i18n的 MoleculeProvider 内使用',
  'solid.error.httpOutsideProvider': 'getHttpClient 必须在配置了HTTP的 MoleculeProvider 内使用',
  'solid.error.storageOutsideProvider':
    'getStorageProvider 必须在配置了存储的 MoleculeProvider 内使用',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider 必须在配置了日志的 MoleculeProvider 内使用',
  'solid.error.useAccordionOutsideProvider': 'Accordion 组件必须在 Accordion 内使用',
  'solid.error.useToastOutsideProvider': 'useToast 必须在 ToastProvider 内使用',
  'solid.error.useChatOutsideProvider': 'useChatProvider 必须在 ChatProvider 内使用',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider 必须在 WorkspaceProvider 中使用。',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider 必须在 EditorProvider 中使用。',
  'solid.error.usePreviewOutsideProvider': 'usePreviewProvider 必须在 PreviewProvider 中使用',
  'solid.error.useAuthOutsideProvider': 'useAuthClient 必须在 AuthProvider 中使用。',
  'solid.error.useHttpOutsideProvider': 'useHttpClient 必须在 HttpProvider 中使用。',
  'solid.error.unsupportedMethod': '不支持的方法：{{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider 必须在 LoggerProvider 中使用',
  'solid.error.oauthFailed': 'OAuth登录失败',
  'solid.error.useRouterOutsideProvider':
    '这里没有路由器。使用路由绑定（`@molecule/app-routing-solid-router`）中的`MoleculeRouterProvider`作为路由器的`root`，或者将`router`传递给`MoleculeProvider`。',
  'solid.error.noRoutedView':
    '这里没有路由视图。Solid Router 将路由组件的嵌套路由作为`props.children`传递给它：你可以将其用作路由的`component`，或者将页面作为子元素传递。',
  'solid.error.useStoreOutsideProvider': 'useStateProvider 必须在 StateProvider 中使用。',
  'solid.error.useStorageOutsideProvider': 'useStorageProvider 必须在 StorageProvider 中使用。',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider 必须在 ThemeProvider 中使用',
}
