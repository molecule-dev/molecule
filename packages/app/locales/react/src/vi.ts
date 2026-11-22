import type { ReactTranslations } from './types.js'

/** React translations for Vietnamese. */
export const vi: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Các thành phần Accordion phải được sử dụng bên trong Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient phải được sử dụng bên trong AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider phải được sử dụng bên trong ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider phải được sử dụng bên trong EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient phải được sử dụng bên trong HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider phải được sử dụng bên trong LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider phải được sử dụng bên trong PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Không có bộ định tuyến ở đây. Hãy gắn một thành phần bộ định tuyến từ liên kết định tuyến của ứng dụng (`BrowserRouter` từ `@molecule/app-routing-react-router`), hoặc truyền `router` cho `MoleculeProvider`. Nếu ứng dụng đã làm điều này, liên kết định tuyến của nó cũ hơn liên kết này: hãy cập nhật nó (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Liên kết định tuyến này không có chế độ xem được định tuyến để hiển thị ở đây: thay vào đó hãy truyền trang dưới dạng các phần tử con. Nếu ứng dụng định tuyến bằng `@molecule/app-routing-react-router`, liên kết đó cũ hơn liên kết này: hãy cập nhật nó (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider phải được sử dụng bên trong StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider phải được sử dụng bên trong StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider phải được sử dụng bên trong ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast phải được sử dụng bên trong ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider phải được sử dụng bên trong WorkspaceProvider',
  'react.error.unsupportedMethod': 'Phương thức không được hỗ trợ: {{method}}',
  'react.error.oauthFailed': 'Đăng nhập OAuth không thành công',
}
