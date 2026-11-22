import type { SolidTranslations } from './types.js'

/** Solid translations for Thai. */
export const th: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า สถานะ',
  'solid.error.authOutsideProvider':
    'getAuthClient ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า การยืนยันตัวตน',
  'solid.error.themeOutsideProvider':
    'getThemeProvider ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า ธีม',
  'solid.error.routerOutsideProvider':
    'getRouter ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า เราเตอร์',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า i18n',
  'solid.error.httpOutsideProvider': 'getHttpClient ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า พื้นที่จัดเก็บ',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider ต้องใช้ภายใน MoleculeProvider ที่กำหนดค่า การบันทึก',
  'solid.error.useAccordionOutsideProvider': 'คอมโพเนนต์ Accordion ต้องใช้ภายใน Accordion',
  'solid.error.useToastOutsideProvider': 'useToast ต้องใช้ภายใน ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider ต้องใช้ภายใน ChatProvider',
  'solid.error.useWorkspaceOutsideProvider': 'ต้องใช้ useWorkspaceProvider ภายใน WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'ต้องใช้ useEditorProvider ภายใน EditorProvider',
  'solid.error.usePreviewOutsideProvider': 'ต้องใช้ usePreviewProvider ภายใน PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'ต้องใช้ useAuthClient ภายใน AuthProvider',
  'solid.error.useHttpOutsideProvider': 'ต้องใช้ useHttpClient ภายใน HttpProvider',
  'solid.error.unsupportedMethod': 'วิธีการที่ไม่รองรับ: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'ต้องใช้ useLoggerProvider ภายใน LoggerProvider',
  'solid.error.oauthFailed': 'การเข้าสู่ระบบ OAuth ล้มเหลว',
  'solid.error.useRouterOutsideProvider':
    'ไม่มีเราเตอร์ในที่นี้ ให้ใช้ `MoleculeRouterProvider` จาก routing bond (`@molecule/app-routing-solid-router`) เป็น `root` ของเราเตอร์ หรือส่งค่า `router` ไปยัง `MoleculeProvider` หากแอปของคุณทำเช่นนี้อยู่แล้ว แสดงว่า routing bond ของแอปนั้นเก่ากว่า binding นี้ โปรดอัปเดต (`npm install @molecule/app-routing-solid-router@latest`)',
  'solid.error.noRoutedView':
    'ไม่มีการกำหนดเส้นทางในมุมมองนี้ Solid Router จะส่งเส้นทางย่อยของคอมโพเนนต์ของเส้นทางหลักเป็น `props.children`: คุณสามารถใช้สิ่งนี้เป็น `component` ของเส้นทางหลัก หรือส่งหน้าเว็บเป็น children ได้',
  'solid.error.useStoreOutsideProvider': 'ต้องใช้ useStateProvider ภายใน StateProvider',
  'solid.error.useStorageOutsideProvider': 'ต้องใช้ useStorageProvider ภายใน StorageProvider',
  'solid.error.useThemeOutsideProvider': 'ต้องใช้ useThemeProvider ภายใน ThemeProvider',
}
