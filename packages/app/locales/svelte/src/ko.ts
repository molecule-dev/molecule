import type { SvelteTranslations } from './types.js'

/** Svelte translations for Korean. */
export const ko: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c \uc0c1\ud0dc \ud504\ub85c\ubc14\uc774\ub354\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.noAuthClient':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c \uc778\uc99d \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.noThemeProvider':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c \ud14c\ub9c8 \ud504\ub85c\ubc14\uc774\ub354\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.noRouter':
    '여기에 라우터가 없습니다. 루트 `+layout.svelte` 파일의 라우팅 본드(`@molecule/app-routing-sveltekit`)에서 `MoleculeRouterProvider` 마운트하거나, 해당 파일에서 `setMoleculeContext({ router })` 호출하세요. 앱에서 이미 이 작업을 수행하고 있다면, 해당 라우팅 본드가 이 바인딩보다 오래된 버전입니다. `npm install @molecule/app-routing-sveltekit@latest` 업데이트하세요.',
  'svelte.error.noI18nProvider':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c I18n \ud504\ub85c\ubc14\uc774\ub354\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.noHttpClient':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c HTTP \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.noStorageProvider':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c \uc2a4\ud1a0\ub9ac\uc9c0 \ud504\ub85c\ubc14\uc774\ub354\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.noLoggerProvider':
    '\ucee8\ud14d\uc2a4\ud2b8\uc5d0\uc11c \ub85c\uac70 \ud504\ub85c\ubc14\uc774\ub354\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4',
  'svelte.error.unknownPaginationDirection':
    '\uc54c \uc218 \uc5c6\ub294 \ud398\uc774\uc9c0\ub124\uc774\uc158 \ubc29\ud5a5: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider는 ChatProvider 내에서 사용해야 합니다',
  'svelte.error.useToastOutsideProvider': 'useToast는 ToastProvider 내에서 사용해야 합니다',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider는 WorkspaceProvider 내에서 사용해야 합니다.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider는 EditorProvider 내에서 사용해야 합니다.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider는 PreviewProvider 내에서 사용해야 합니다.',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient는 AuthProvider 내에서 사용해야 합니다.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider는 ThemeProvider 내에서 사용해야 합니다.',
  'svelte.error.useRouterOutsideProvider':
    '여기에 라우터가 없습니다. 루트 `+layout.svelte` 파일의 라우팅 본드(`@molecule/app-routing-sveltekit`)에서 `MoleculeRouterProvider` 마운트하거나, 해당 파일에서 `setMoleculeContext({ router })` 호출하세요. 앱에서 이미 이 작업을 수행하고 있다면, 해당 라우팅 본드가 이 바인딩보다 오래된 버전입니다. `npm install @molecule/app-routing-sveltekit@latest` 업데이트하세요.',
  'svelte.error.noRoutedView':
    '여기에는 라우팅된 뷰가 없습니다. SvelteKit은 레이아웃에 페이지를 `children` 으로 제공합니다. 따라서 이 컴포넌트 내부에 `{@render children()}` 전달해야 합니다.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient는 HttpProvider 내에서 사용해야 합니다.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider는 StorageProvider 내에서 사용해야 합니다.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider는 LoggerProvider 내에서 사용해야 합니다.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider는 StateProvider 내에서 사용해야 합니다.',
  'svelte.error.unsupportedMethod': '지원되지 않는 메서드: {{method}}',
  'svelte.error.oauthFailed': 'OAuth 로그인 실패',
}
