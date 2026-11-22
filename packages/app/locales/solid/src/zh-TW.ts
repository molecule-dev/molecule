import type { SolidTranslations } from './types.js'

/** Solid translations for Chinese (Traditional). */
export const zhTW: SolidTranslations = {
  'solid.error.stateOutsideProvider': 'getStateProvider 必須在配置了狀態的 MoleculeProvider 內使用',
  'solid.error.authOutsideProvider': 'getAuthClient 必須在配置了驗證的 MoleculeProvider 內使用',
  'solid.error.themeOutsideProvider': 'getThemeProvider 必須在配置了主題的 MoleculeProvider 內使用',
  'solid.error.routerOutsideProvider': 'getRouter 必須在配置了路由器的 MoleculeProvider 內使用',
  'solid.error.i18nOutsideProvider': 'getI18nProvider 必須在配置了i18n的 MoleculeProvider 內使用',
  'solid.error.httpOutsideProvider': 'getHttpClient 必須在配置了HTTP的 MoleculeProvider 內使用',
  'solid.error.storageOutsideProvider':
    'getStorageProvider 必須在配置了儲存的 MoleculeProvider 內使用',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider 必須在配置了日誌的 MoleculeProvider 內使用',
  'solid.error.useAccordionOutsideProvider': 'Accordion 元件必須在 Accordion 內使用',
  'solid.error.useToastOutsideProvider': 'useToast 必須在 ToastProvider 內使用',
  'solid.error.useChatOutsideProvider': 'useChatProvider 必須在 ChatProvider 內使用',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider 必須在 WorkspaceProvider 中使用。',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider 必須在 EditorProvider 中使用。',
  'solid.error.usePreviewOutsideProvider': 'usePreviewProvider 必須在 PreviewProvider 中使用',
  'solid.error.useAuthOutsideProvider': 'useAuthClient 必須在 AuthProvider 中使用。',
  'solid.error.useHttpOutsideProvider': 'useHttpClient 必須在 HttpProvider 中使用。',
  'solid.error.unsupportedMethod': '不支援的方法：{{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider 必須在 LoggerProvider 中使用',
  'solid.error.oauthFailed': 'OAuth登入失敗',
  'solid.error.useRouterOutsideProvider':
    '這裡沒有路由器。請使用路由綁定（`@molecule/app-routing-solid-router`）中的`MoleculeRouterProvider`作為路由器的`root`，或將`router`傳遞給`MoleculeProvider`。如果應用程式已經這樣做了，則其路由綁定版本低於此綁定：請更新它（`npm install @molecule/app-routing-solid-router@latest`）。',
  'solid.error.noRoutedView':
    '這裡沒有路由視圖。 Solid Router 將路由元件的嵌套路由作為`props.children`傳遞給它：你可以將其用作路由的`component`，或將頁面作為子元素傳遞。',
  'solid.error.useStoreOutsideProvider': 'useStateProvider 必須在 StateProvider 中使用。',
  'solid.error.useStorageOutsideProvider': 'useStorageProvider 必須在 StorageProvider 中使用。',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider 必須在 ThemeProvider 中使用',
}
