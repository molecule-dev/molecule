import type { RoutingTranslations } from './types.js'

/** Routing translations for Japanese. */
export const ja: RoutingTranslations = {
  'routing.error.missingParam': 'パス "{{name}}" のパラメータ "{{pattern}}" がありません',
  'routing.error.routeNotFound': 'ルート "{{name}}" が見つかりません',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter は MoleculeRouterProvider 内で使用する必要があります',
  'routing.error.noNavigationRef':
    'ナビゲーション ref が設定されていません。`MoleculeProvider` がマウントされていることを確認してください。',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` は React Router のルーター内で使用する必要があります。`BrowserRouter`、`HashRouter`、`MemoryRouter`、`Router`、または `RouterProvider` をマウントしてください。',
}
