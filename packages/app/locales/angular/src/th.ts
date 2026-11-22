import type { AngularTranslations } from './types.js'

/** Angular translations for Thai. */
export const th: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ต้องใช้ภายใน ChatProvider',
  'angular.error.useAuthOutsideProvider': 'ต้องใช้ useAuthClient ภายใน AuthProvider',
  'angular.error.oauthFailed': 'การเข้าสู่ระบบ OAuth ล้มเหลว',
  'angular.error.unsupportedMethod': 'วิธีการที่ไม่รองรับ: {{method}}',
  'angular.error.useStoreOutsideProvider': 'ต้องใช้ useStateProvider ภายใน StateProvider',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider ต้องใช้ภายใน EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient ต้องใช้ภายใน HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider ต้องใช้ภายใน LoggerProvider',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider ต้องใช้ภายใน PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'ไม่มีเราเตอร์ในที่นี้ เพิ่ม `provideMoleculeRouter()` จาก routing bond (`@molecule/app-routing-angular-router`) ลงใน providers ของแอป หลังจาก `provideRouter(routes)` ของ Angular หรือส่ง `router` ไปยัง `provideMolecule` หากแอปทำเช่นนี้อยู่แล้ว แสดงว่า routing bond ของแอปนั้นเก่ากว่า binding นี้: อัปเดต (`npm install @molecule/app-routing-angular-router@latest`)',
  'angular.error.noRoutedView':
    'การกำหนดเส้นทางนี้ไม่มีมุมมองเส้นทางที่จะแสดงผลที่นี่: ให้ส่งหน้านั้นเป็นลูกแทน หากแอปกำหนดเส้นทางด้วย `@molecule/app-routing-angular-router` การกำหนดเส้นทางนั้นจะเก่ากว่าการผูกนี้: อัปเดต (`npm install @molecule/app-routing-angular-router@latest`)',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider ต้องใช้ภายใน StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ต้องใช้ภายใน ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ต้องใช้ภายใน WorkspaceProvider',
}
