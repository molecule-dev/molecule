import type { SolidTranslations } from './types.js'

/** Solid translations for Japanese. */
export const ja: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProviderは状態が構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.authOutsideProvider':
    'getAuthClientは認証が構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.themeOutsideProvider':
    'getThemeProviderはテーマが構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.routerOutsideProvider':
    'getRouterはルーターが構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.i18nOutsideProvider':
    'getI18nProviderはi18nが構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.httpOutsideProvider':
    'getHttpClientはHTTPが構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.storageOutsideProvider':
    'getStorageProviderはストレージが構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.loggerOutsideProvider':
    'getLoggerProviderはロガーが構成されたMoleculeProvider内で使用する必要があります',
  'solid.error.useAccordionOutsideProvider':
    'AccordionコンポーネントはAccordion内で使用する必要があります',
  'solid.error.useToastOutsideProvider': 'useToastはToastProvider内で使用する必要があります',
  'solid.error.useChatOutsideProvider': 'useChatProviderはChatProvider内で使用する必要があります',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProviderはWorkspaceProvider内で使用する必要があります。',
  'solid.error.useEditorOutsideProvider':
    'useEditorProviderはEditorProvider内で使用する必要があります。',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProviderはPreviewProvider内で使用する必要があります。',
  'solid.error.useAuthOutsideProvider': 'useAuthClientはAuthProvider内で使用する必要があります。',
  'solid.error.useHttpOutsideProvider': 'useHttpClientはHttpProvider内で使用する必要があります。',
  'solid.error.unsupportedMethod': 'サポートされていないメソッド: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProviderはLoggerProvider内で使用する必要があります。',
  'solid.error.oauthFailed': 'OAuthログインに失敗しました',
  'solid.error.useRouterOutsideProvider':
    'ルーターはここにはありません。ルーティング ボンド (`@molecule/app-routing-solid-router`) の`MoleculeRouterProvider`ルーターの`root`として使用するか、`router`を`MoleculeProvider`に渡してください。アプリが既にこれを行っている場合、そのルーティング ボンドはこのバインディングよりも古いため、更新してください (`npm install @molecule/app-routing-solid-router@latest`)。',
  'solid.error.noRoutedView':
    'ここではルーティングされたビューはありません。Solid Router は、ルートのコンポーネントにネストされたルートを`props.children`として渡します。これをルートの`component`として使用するか、ページを子要素として渡してください。',
  'solid.error.useStoreOutsideProvider':
    'useStateProviderはStateProvider内で使用する必要があります。',
  'solid.error.useStorageOutsideProvider':
    'useStorageProviderはStorageProvider内で使用する必要があります。',
  'solid.error.useThemeOutsideProvider':
    'useThemeProviderはThemeProvider内で使用する必要があります。',
}
