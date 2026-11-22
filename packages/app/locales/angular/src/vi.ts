import type { AngularTranslations } from './types.js'

/** Angular translations for Vietnamese. */
export const vi: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider phải được sử dụng bên trong ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient phải được sử dụng trong AuthProvider.',
  'angular.error.oauthFailed': 'Đăng nhập OAuth thất bại',
  'angular.error.unsupportedMethod': 'Phương thức không được hỗ trợ: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider phải được sử dụng bên trong một StateProvider.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider phải được sử dụng bên trong EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient phải được sử dụng bên trong HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider phải được sử dụng bên trong LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider phải được sử dụng bên trong PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Không có router ở đây. Thêm `provideMoleculeRouter()` từ liên kết định tuyến (`@molecule/app-routing-angular-router`) vào các provider của ứng dụng, sau `provideRouter(routes)` của Angular, hoặc truyền `router` cho `provideMolecule`. Nếu ứng dụng đã làm điều này, liên kết định tuyến của nó cũ hơn liên kết này: hãy cập nhật nó (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Liên kết định tuyến này không có chế độ xem được định tuyến để hiển thị ở đây: thay vào đó hãy truyền trang dưới dạng các phần tử con. Nếu ứng dụng định tuyến bằng `@molecule/app-routing-angular-router`, liên kết đó cũ hơn liên kết này: hãy cập nhật nó (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider phải được sử dụng bên trong StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider phải được sử dụng bên trong ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider phải được sử dụng bên trong WorkspaceProvider',
}
