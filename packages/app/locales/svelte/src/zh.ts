import type { SvelteTranslations } from './types.js'

/** Svelte translations for Chinese. */
export const zh: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u72b6\u6001\u63d0\u4f9b\u8005',
  'svelte.error.noAuthClient':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u8ba4\u8bc1\u5ba2\u6237\u7aef',
  'svelte.error.noThemeProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u4e3b\u9898\u63d0\u4f9b\u8005',
  'svelte.error.noRouter': '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u8def\u7531\u5668',
  'svelte.error.noI18nProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230I18n\u63d0\u4f9b\u8005',
  'svelte.error.noHttpClient':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230HTTP\u5ba2\u6237\u7aef',
  'svelte.error.noStorageProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u5b58\u50a8\u63d0\u4f9b\u8005',
  'svelte.error.noLoggerProvider':
    '\u5728\u4e0a\u4e0b\u6587\u4e2d\u672a\u627e\u5230\u65e5\u5fd7\u63d0\u4f9b\u8005',
  'svelte.error.unknownPaginationDirection':
    '\u672a\u77e5\u7684\u5206\u9875\u65b9\u5411: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider 必须在 ChatProvider 内使用',
  'svelte.error.useToastOutsideProvider': 'useToast 必须在 ToastProvider 内使用',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider 必须在 WorkspaceProvider 中使用。',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider 必须在 EditorProvider 中使用。',
  'svelte.error.usePreviewOutsideProvider': 'usePreviewProvider 必须在 PreviewProvider 中使用',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient 必须在 AuthProvider 中使用。',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider 必须在 ThemeProvider 中使用',
  'svelte.error.useRouterOutsideProvider': 'useRouterInstance 必须在 RouterProvider 中使用。',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient 必须在 HttpProvider 中使用。',
  'svelte.error.useStorageOutsideProvider': 'useStorageProvider 必须在 StorageProvider 中使用。',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider 必须在 LoggerProvider 中使用',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider 必须在 StateProvider 中使用。',
  'svelte.error.unsupportedMethod': '不支持的方法：{{method}}',
  'svelte.error.oauthFailed': 'OAuth登录失败',
}
