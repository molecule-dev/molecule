import type { SolidTranslations } from './types.js'

/** Solid translations for Korean. */
export const ko: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider는 상태가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.authOutsideProvider':
    'getAuthClient는 인증이 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.themeOutsideProvider':
    'getThemeProvider는 테마가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.routerOutsideProvider':
    'getRouter는 라우터가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider는 i18n이 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.httpOutsideProvider':
    'getHttpClient는 HTTP가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.storageOutsideProvider':
    'getStorageProvider는 스토리지가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider는 로거가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.useAccordionOutsideProvider':
    'Accordion 컴포넌트는 Accordion 내에서 사용해야 합니다',
  'solid.error.useToastOutsideProvider': 'useToast는 ToastProvider 내에서 사용해야 합니다',
  'solid.error.useChatOutsideProvider': 'useChatProvider는 ChatProvider 내에서 사용해야 합니다',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider는 WorkspaceProvider 내에서 사용해야 합니다.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider는 EditorProvider 내에서 사용해야 합니다.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider는 PreviewProvider 내에서 사용해야 합니다.',
  'solid.error.useAuthOutsideProvider': 'useAuthClient는 AuthProvider 내에서 사용해야 합니다.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient는 HttpProvider 내에서 사용해야 합니다.',
  'solid.error.unsupportedMethod': '지원되지 않는 메서드: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider는 LoggerProvider 내에서 사용해야 합니다.',
  'solid.error.oauthFailed': 'OAuth 로그인 실패',
  'solid.error.useRouterOutsideProvider':
    '여기에 라우터가 없습니다. 라우팅 본드(`@molecule/app-routing-solid-router`)의 `MoleculeRouterProvider` 라우터의 `root`로 사용하거나 `MoleculeProvider`에 `router` 전달하세요. 앱에서 이미 이렇게 하고 있다면 해당 라우팅 본드가 이 바인딩보다 오래된 버전이므로 업데이트하세요(`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    '여기에는 라우팅된 뷰가 없습니다. Solid Router는 라우트의 컴포넌트에 중첩된 라우트를 `props.children`으로 제공합니다. 이를 라우트의 `component`로 사용하거나 페이지를 children으로 전달하세요.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider는 StateProvider 내에서 사용해야 합니다.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider는 StorageProvider 내에서 사용해야 합니다.',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider는 ThemeProvider 내에서 사용해야 합니다.',
}
