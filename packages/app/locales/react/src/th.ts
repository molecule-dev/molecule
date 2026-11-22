import type { ReactTranslations } from './types.js'

/** React translations for Thai. */
export const th: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'คอมโพเนนต์ Accordion ต้องใช้ภายใน Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient ต้องใช้ภายใน AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider ต้องใช้ภายใน ChatProvider',
  'react.error.useEditorOutsideProvider': 'useEditorProvider ต้องใช้ภายใน EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient ต้องใช้ภายใน HttpProvider',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider ต้องใช้ภายใน LoggerProvider',
  'react.error.usePreviewOutsideProvider': 'usePreviewProvider ต้องใช้ภายใน PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'ไม่มีเราเตอร์ในที่นี้ ให้ติดตั้งคอมโพเนนต์เราเตอร์จากส่วนเชื่อมต่อการกำหนดเส้นทางของแอป (`BrowserRouter` จาก `@molecule/app-routing-react-router`) หรือส่ง `router` ไปยัง `MoleculeProvider`',
  'react.error.noRoutedView':
    'การกำหนดเส้นทางนี้ไม่มีมุมมองที่กำหนดไว้ให้แสดงผลที่นี่: โปรดส่งหน้าเว็บเป็นหน้าย่อยแทน',
  'react.error.useStoreOutsideProvider': 'useStateProvider ต้องใช้ภายใน StateProvider',
  'react.error.useStorageOutsideProvider': 'useStorageProvider ต้องใช้ภายใน StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider ต้องใช้ภายใน ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast ต้องใช้ภายใน ToastProvider',
  'react.error.useWorkspaceOutsideProvider': 'useWorkspaceProvider ต้องใช้ภายใน WorkspaceProvider',
  'react.error.unsupportedMethod': 'เมธอดที่ไม่รองรับ: {{method}}',
  'react.error.oauthFailed': 'การเข้าสู่ระบบด้วย OAuth ล้มเหลว',
}
