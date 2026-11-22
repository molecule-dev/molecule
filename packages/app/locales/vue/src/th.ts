import type { VueTranslations } from './types.js'

/** Vue translations for Thai. */
export const th: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ไม่มีเราเตอร์ในที่นี้ ให้ห่อแอปด้วย `MoleculeRouterProvider` จากส่วนเชื่อมต่อการกำหนดเส้นทาง (`@molecule/app-routing-vue-router`) หรือส่ง `router` ไปยัง `moleculePlugin`',
  'vue.error.noRoutedView':
    'การกำหนดเส้นทางนี้ไม่มีมุมมองที่กำหนดไว้ให้แสดงผลที่นี่: โปรดส่งหน้าเว็บเป็นหน้าย่อยแทน',
  'vue.error.useStoreOutsideProvider': 'useStateProvider ต้องใช้ภายใน StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ต้องใช้ภายใน ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient ต้องใช้ภายใน AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider ต้องใช้ภายใน StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient ต้องใช้ภายใน HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider ต้องใช้ภายใน LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast ต้องใช้ภายใน ToastProvider',
  'vue.error.unsupportedMethod': 'เมธอดที่ไม่รองรับ: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ต้องใช้ภายใน ChatProvider',
  'vue.error.useEditorOutsideProvider': 'ต้องใช้ useEditorProvider ภายใน EditorProvider',
  'vue.error.oauthFailed': 'การเข้าสู่ระบบ OAuth ล้มเหลว',
  'vue.error.usePreviewOutsideProvider': 'ต้องใช้ usePreviewProvider ภายใน PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider': 'ต้องใช้ useWorkspaceProvider ภายใน WorkspaceProvider',
}
