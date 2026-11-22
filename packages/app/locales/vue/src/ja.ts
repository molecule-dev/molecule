import type { VueTranslations } from './types.js'

/** Vue translations for Japanese. */
export const ja: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ルーターは不要です。ルーティングボンド（`@molecule/app-routing-vue-router`）の`MoleculeRouterProvider`でアプリをラップするか、`router` `moleculePlugin`に渡してください。アプリが既にこの操作を行っている場合、そのルーティングボンドはこのバインディングよりも古いため、更新してください（`npm install @molecule/app-routing-vue-router@latest`）。',
  'vue.error.noRoutedView':
    'このルーティング ボンドには、ここにレンダリングするルーティング ビューがありません。代わりにページを子要素として渡してください。アプリが`@molecule/app-routing-vue-router`を使用してルーティングしている場合、そのボンドはこのバインディングよりも古いため、更新してください (`npm install @molecule/app-routing-vue-router@latest`)。',
  'vue.error.useStoreOutsideProvider': 'useStateProviderはStateProvider内で使用する必要があります',
  'vue.error.useThemeOutsideProvider': 'useThemeProviderはThemeProvider内で使用する必要があります',
  'vue.error.useAuthOutsideProvider': 'useAuthClientはAuthProvider内で使用する必要があります',
  'vue.error.useStorageOutsideProvider':
    'useStorageProviderはStorageProvider内で使用する必要があります',
  'vue.error.useHttpOutsideProvider': 'useHttpClientはHttpProvider内で使用する必要があります',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProviderはLoggerProvider内で使用する必要があります',
  'vue.error.useToastOutsideProvider': 'useToastはToastProvider内で使用する必要があります',
  'vue.error.unsupportedMethod': 'サポートされていないメソッド: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProviderはChatProvider内で使用する必要があります',
  'vue.error.useEditorOutsideProvider':
    'useEditorProviderはEditorProvider内で使用する必要があります。',
  'vue.error.oauthFailed': 'OAuthログインに失敗しました',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProviderはPreviewProvider内で使用する必要があります。',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProviderはWorkspaceProvider内で使用する必要があります。',
}
