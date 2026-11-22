import type { AngularTranslations } from './types.js'

/** Angular translations for Japanese. */
export const ja: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProviderはChatProvider内で使用する必要があります',
  'angular.error.useAuthOutsideProvider': 'useAuthClientはAuthProvider内で使用する必要があります。',
  'angular.error.oauthFailed': 'OAuthログインに失敗しました',
  'angular.error.unsupportedMethod': 'サポートされていないメソッド: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProviderはStateProvider内で使用する必要があります。',

  'angular.error.useEditorOutsideProvider':
    'useEditorProviderはEditorProvider内で使用する必要があります',
  'angular.error.useHttpOutsideProvider': 'useHttpClientはHttpProvider内で使用する必要があります',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProviderはLoggerProvider内で使用する必要があります',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProviderはPreviewProvider内で使用する必要があります',
  'angular.error.useRouterOutsideProvider':
    'ここにルーターはありません。Angular の`provideRouter(routes)`後に、ルーティング ボンド (`@molecule/app-routing-angular-router`) から`provideMoleculeRouter()`アプリのプロバイダーに追加するか、`router`を`provideMolecule`に渡します。アプリが既にこれを行っている場合、そのルーティング ボンドはこのバインディングよりも古いので、更新します (`npm install @molecule/app-routing-angular-router@latest`)。',
  'angular.error.noRoutedView':
    'このルーティング ボンドには、ここでレンダリングするルーティング ビューがありません。代わりにページを子要素として渡してください。アプリが`@molecule/app-routing-angular-router`を使用してルーティングしている場合、そのボンドはこのバインディングよりも古いため、更新してください (`npm install @molecule/app-routing-angular-router@latest`)。',
  'angular.error.useStorageOutsideProvider':
    'useStorageProviderはStorageProvider内で使用する必要があります',
  'angular.error.useThemeOutsideProvider':
    'useThemeProviderはThemeProvider内で使用する必要があります',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProviderはWorkspaceProvider内で使用する必要があります',
}
