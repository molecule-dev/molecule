import type { AngularTranslations } from './types.js'

/** Angular translations for Korean. */
export const ko: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider는 ChatProvider 내에서 사용해야 합니다',
  'angular.error.useAuthOutsideProvider': 'useAuthClient는 AuthProvider 내에서 사용해야 합니다.',
  'angular.error.oauthFailed': 'OAuth 로그인 실패',
  'angular.error.unsupportedMethod': '지원되지 않는 메서드: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider는 StateProvider 내에서 사용해야 합니다.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider는 EditorProvider 내에서 사용해야 합니다',
  'angular.error.useHttpOutsideProvider': 'useHttpClient는 HttpProvider 내에서 사용해야 합니다',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider는 LoggerProvider 내에서 사용해야 합니다',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider는 PreviewProvider 내에서 사용해야 합니다',
  'angular.error.useRouterOutsideProvider':
    '여기에 라우터가 없습니다. Angular의 `provideRouter(routes)` 다음에 라우팅 본드(`@molecule/app-routing-angular-router`)에서 앱의 공급자로 `provideMoleculeRouter()` 추가하거나 `router` `provideMolecule` 로 전달합니다.',
  'angular.error.noRoutedView':
    '이 라우팅 연결에는 여기에 렌더링할 라우팅된 뷰가 없습니다. 대신 페이지를 자식으로 전달하세요.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider는 StorageProvider 내에서 사용해야 합니다',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider는 ThemeProvider 내에서 사용해야 합니다',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider는 WorkspaceProvider 내에서 사용해야 합니다',
}
