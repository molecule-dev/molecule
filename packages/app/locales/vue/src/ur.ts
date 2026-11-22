import type { VueTranslations } from './types.js'

/** Vue translations for Urdu. */
export const ur: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'یہاں کوئی راؤٹر نہیں ہے۔ روٹنگ بانڈ (`@molecule/app-routing-vue-router`) سے ایپ کو `MoleculeRouterProvider` میں لپیٹیں، یا `router` کو `moleculePlugin` پر منتقل کریں۔',
  'vue.error.noRoutedView':
    'اس روٹنگ بانڈ کو یہاں پیش کرنے کے لیے کوئی روٹڈ ویو نہیں ہے: اس کے بجائے صفحہ بچوں کے طور پر پاس کریں۔',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider کو StateProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider کو ThemeProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient کو AuthProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider کو StorageProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient کو HttpProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider کو LoggerProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useToastOutsideProvider': 'useToast کو ToastProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.unsupportedMethod': 'غیر تعاون یافتہ طریقہ: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider کو ChatProvider کے اندر استعمال کیا جانا چاہیے',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider کو EditorProvider کے اندر استعمال کرنا چاہیے۔',
  'vue.error.oauthFailed': 'OAuth لاگ ان ناکام ہوگیا۔',
  'vue.error.usePreviewOutsideProvider':
    'UsePreviewProvider کا استعمال ایک PreviewProvider کے اندر ہونا چاہیے۔',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider کو WorkspaceProvider کے اندر استعمال کیا جانا چاہیے۔',
}
