import type { SvelteTranslations } from './types.js'

/** Svelte translations for Arabic. */
export const ar: SvelteTranslations = {
  'svelte.error.noStateProvider': 'لم يتم العثور على مزود الحالة في السياق',
  'svelte.error.noAuthClient': 'لم يتم العثور على عميل المصادقة في السياق',
  'svelte.error.noThemeProvider': 'لم يتم العثور على مزود السمة في السياق',
  'svelte.error.noRouter': 'لم يتم العثور على جهاز التوجيه في السياق',
  'svelte.error.noI18nProvider': 'لم يتم العثور على مزود i18n في السياق',
  'svelte.error.noHttpClient': 'لم يتم العثور على عميل HTTP في السياق',
  'svelte.error.noStorageProvider': 'لم يتم العثور على مزود التخزين في السياق',
  'svelte.error.noLoggerProvider': 'لم يتم العثور على مزود السجل في السياق',
  'svelte.error.unknownPaginationDirection': 'اتجاه ترقيم صفحات غير معروف: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'يجب استخدام useChatProvider داخل ChatProvider',
  'svelte.error.useToastOutsideProvider': 'يجب استخدام useToast داخل ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'يجب استخدام useWorkspaceProvider داخل WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider': 'يجب استخدام useEditorProvider داخل EditorProvider',
  'svelte.error.usePreviewOutsideProvider': 'يجب استخدام usePreviewProvider داخل PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'يجب استخدام useAuthClient داخل موفر المصادقة (AuthProvider)',
  'svelte.error.useThemeOutsideProvider': 'يجب استخدام useThemeProvider داخل ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'يجب استخدام useRouterInstance داخل RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'يجب استخدام useHttpClient داخل HttpProvider',
  'svelte.error.useStorageOutsideProvider': 'يجب استخدام useStorageProvider داخل StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'يجب استخدام useLoggerProvider داخل LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'يجب استخدام useStateProvider داخل StateProvider',
  'svelte.error.unsupportedMethod': 'طريقة غير مدعومة: {{method}}',
  'svelte.error.oauthFailed': 'فشل تسجيل الدخول باستخدام OAuth',
}
