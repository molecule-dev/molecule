import type { ReactTranslations } from './types.js'

/** React translations for Korean. */
export const ko: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion 컴포넌트는 Accordion 내에서 사용해야 합니다',
  'react.error.useAuthOutsideProvider': 'useAuthClient는 AuthProvider 내에서 사용해야 합니다',
  'react.error.useChatOutsideProvider': 'useChatProvider는 ChatProvider 내에서 사용해야 합니다',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider는 EditorProvider 내에서 사용해야 합니다',
  'react.error.useHttpOutsideProvider': 'useHttpClient는 HttpProvider 내에서 사용해야 합니다',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider는 LoggerProvider 내에서 사용해야 합니다',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider는 PreviewProvider 내에서 사용해야 합니다',
  'react.error.useRouterOutsideProvider':
    '여기에 라우터가 없습니다. 앱의 라우팅 본드( `@molecule/app-routing-react-router`의 `BrowserRouter` )에서 라우터 구성 요소를 마운트하거나 `MoleculeProvider`에 `router` 전달하세요. 앱에서 이미 이렇게 하고 있다면 해당 라우팅 본드가 이 바인딩보다 오래된 것이므로 업데이트하세요(`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    '이 라우팅 바인딩에는 여기에 렌더링할 라우팅된 뷰가 없습니다. 대신 페이지를 자식으로 전달하세요. 앱이 `@molecule/app-routing-react-router` 사용하여 라우팅하는 경우 해당 바인딩이 이 바인딩보다 이전 버전입니다. `npm install @molecule/app-routing-react-router@latest` 통해 업데이트하세요.',
  'react.error.useStoreOutsideProvider': 'useStateProvider는 StateProvider 내에서 사용해야 합니다',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider는 StorageProvider 내에서 사용해야 합니다',
  'react.error.useThemeOutsideProvider': 'useThemeProvider는 ThemeProvider 내에서 사용해야 합니다',
  'react.error.useToastOutsideProvider': 'useToast는 ToastProvider 내에서 사용해야 합니다',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider는 WorkspaceProvider 내에서 사용해야 합니다',
  'react.error.unsupportedMethod': '지원되지 않는 메서드: {{method}}',
  'react.error.oauthFailed': 'OAuth 로그인에 실패했습니다',
}
