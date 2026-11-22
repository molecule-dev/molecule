import type { ReactTranslations } from './types.js'

/** React translations for Japanese. */
export const ja: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'AccordionコンポーネントはAccordion内で使用する必要があります',
  'react.error.useAuthOutsideProvider': 'useAuthClientはAuthProvider内で使用する必要があります',
  'react.error.useChatOutsideProvider': 'useChatProviderはChatProvider内で使用する必要があります',
  'react.error.useEditorOutsideProvider':
    'useEditorProviderはEditorProvider内で使用する必要があります',
  'react.error.useHttpOutsideProvider': 'useHttpClientはHttpProvider内で使用する必要があります',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProviderはLoggerProvider内で使用する必要があります',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProviderはPreviewProvider内で使用する必要があります',
  'react.error.useRouterOutsideProvider':
    'ルーターはここにはありません。アプリのルーティングボンドからルーターコンポーネントをマウントするか（`@molecule/app-routing-react-router`の`BrowserRouter`）、`MoleculeProvider`に`router`を渡してください。アプリが既にこれを行っている場合、そのルーティングボンドはこのバインディングよりも古いため、更新してください（`npm install @molecule/app-routing-react-router@latest`）。',
  'react.error.noRoutedView':
    'このルーティング ボンドには、ここにレンダリングするルーティング ビューがありません。代わりにページを子要素として渡してください。アプリが`@molecule/app-routing-react-router`を使用してルーティングしている場合、そのボンドはこのバインディングよりも古いため、更新してください (`npm install @molecule/app-routing-react-router@latest`)。',
  'react.error.useStoreOutsideProvider':
    'useStateProviderはStateProvider内で使用する必要があります',
  'react.error.useStorageOutsideProvider':
    'useStorageProviderはStorageProvider内で使用する必要があります',
  'react.error.useThemeOutsideProvider':
    'useThemeProviderはThemeProvider内で使用する必要があります',
  'react.error.useToastOutsideProvider': 'useToastはToastProvider内で使用する必要があります',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProviderはWorkspaceProvider内で使用する必要があります',
  'react.error.unsupportedMethod': 'サポートされていないメソッド: {{method}}',
  'react.error.oauthFailed': 'OAuth ログインに失敗しました',
}
