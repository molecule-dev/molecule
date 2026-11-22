import type { VueTranslations } from './types.js'

/** Vue translations for Korean. */
export const ko: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    '여기에 라우터가 없습니다. 라우팅 바인딩(`@molecule/app-routing-vue-router`)의 `MoleculeRouterProvider` 로 앱을 감싸거나 `moleculePlugin` 에 `router` 전달하세요. 앱이 이미 이렇게 하고 있다면, 해당 라우팅 바인딩이 이 바인딩보다 오래된 것이므로 업데이트하세요(`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    '이 라우팅 바인딩에는 여기에 렌더링할 라우팅된 뷰가 없습니다. 대신 페이지를 자식으로 전달하세요. 앱이 `@molecule/app-routing-vue-router` 사용하여 라우팅하는 경우 해당 바인딩이 이 바인딩보다 이전 버전입니다. `npm install @molecule/app-routing-vue-router@latest` 통해 업데이트하세요.',
  'vue.error.useStoreOutsideProvider': 'useStateProvider는 StateProvider 내에서 사용해야 합니다',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider는 ThemeProvider 내에서 사용해야 합니다',
  'vue.error.useAuthOutsideProvider': 'useAuthClient는 AuthProvider 내에서 사용해야 합니다',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider는 StorageProvider 내에서 사용해야 합니다',
  'vue.error.useHttpOutsideProvider': 'useHttpClient는 HttpProvider 내에서 사용해야 합니다',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider는 LoggerProvider 내에서 사용해야 합니다',
  'vue.error.useToastOutsideProvider': 'useToast는 ToastProvider 내에서 사용해야 합니다',
  'vue.error.unsupportedMethod': '지원되지 않는 메서드: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider는 ChatProvider 내에서 사용해야 합니다',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider는 EditorProvider 내에서 사용해야 합니다.',
  'vue.error.oauthFailed': 'OAuth 로그인 실패',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider는 PreviewProvider 내에서 사용해야 합니다.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider는 WorkspaceProvider 내에서 사용해야 합니다.',
}
