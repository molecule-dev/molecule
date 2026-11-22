import type { SvelteTranslations } from './types.js'

/** Svelte translations for Chinese (Traditional). */
export const zhTW: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u72c0\u614b\u63d0\u4f9b\u8005',
  'svelte.error.noAuthClient':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u9a57\u8b49\u7528\u6236\u7aef',
  'svelte.error.noThemeProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u4e3b\u984c\u63d0\u4f9b\u8005',
  'svelte.error.noRouter':
    '這裡沒有路由器。請從根目錄`+layout.svelte`中的路由綁定（`@molecule/app-routing-sveltekit`）掛載`MoleculeRouterProvider`，或在那裡呼叫`setMoleculeContext({ router })`。如果應用程式已經這樣做了，則其路由綁定版本低於此綁定：請更新它（`npm install @molecule/app-routing-sveltekit@latest`）。',
  'svelte.error.noI18nProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230I18n\u63d0\u4f9b\u8005',
  'svelte.error.noHttpClient':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230HTTP\u7528\u6236\u7aef',
  'svelte.error.noStorageProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u5132\u5b58\u63d0\u4f9b\u8005',
  'svelte.error.noLoggerProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u65e5\u8a8c\u63d0\u4f9b\u8005',
  'svelte.error.unknownPaginationDirection':
    '\u672a\u77e5\u7684\u5206\u9801\u65b9\u5411: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider 必須在 ChatProvider 內使用',
  'svelte.error.useToastOutsideProvider': 'useToast 必須在 ToastProvider 內使用',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider 必須在 WorkspaceProvider 中使用。',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider 必須在 EditorProvider 中使用。',
  'svelte.error.usePreviewOutsideProvider': 'usePreviewProvider 必須在 PreviewProvider 中使用',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient 必須在 AuthProvider 中使用。',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider 必須在 ThemeProvider 中使用',
  'svelte.error.useRouterOutsideProvider':
    '這裡沒有路由器。請從根目錄`+layout.svelte`中的路由綁定（`@molecule/app-routing-sveltekit`）掛載`MoleculeRouterProvider`，或在那裡呼叫`setMoleculeContext({ router })`。如果應用程式已經這樣做了，則其路由綁定版本低於此綁定：請更新它（`npm install @molecule/app-routing-sveltekit@latest`）。',
  'svelte.error.noRoutedView':
    '這裡沒有路由視圖。 SvelteKit 將佈局的頁面作為`children`傳遞給元件：在該元件內部傳遞`{@render children()}`。',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient 必須在 HttpProvider 中使用。',
  'svelte.error.useStorageOutsideProvider': 'useStorageProvider 必須在 StorageProvider 中使用。',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider 必須在 LoggerProvider 中使用',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider 必須在 StateProvider 中使用。',
  'svelte.error.unsupportedMethod': '不支援的方法：{{method}}',
  'svelte.error.oauthFailed': 'OAuth登入失敗',
}
