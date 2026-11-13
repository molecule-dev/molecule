import type { RoutingTranslations } from './types.js'

/** Routing translations for Japanese. */
export const ja: RoutingTranslations = {
  'routing.error.missingParam': 'パス "{{name}}" のパラメータ "{{pattern}}" がありません',
  'routing.error.routeNotFound': 'ルート "{{name}}" が見つかりません',
  'routing.error.noNavigationRef':
    'ナビゲーション ref が設定されていません。`MoleculeProvider` がマウントされていることを確認してください。',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` は React Router のルーター内で使用する必要があります。`BrowserRouter`、`HashRouter`、`MemoryRouter`、`Router`、または `RouterProvider` をマウントしてください。',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router の history が、そのコンポーネントがレンダリングされる前に使用されました。MoleculeRouterProvider または useMoleculeRouter を通じて React Router のルーター内でマウントしてください。',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize は正の安全な整数である必要があります',
  'routing.listRoute.error.authRequired':
    'useListRoute: 保護された選択には auth.status と auth.redirectTo が必要です',
  'routing.listRoute.error.unknownSelection': 'useListRoute: 不明な選択 "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: 不明なフィルター "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: パスフィルター "{{filter}}" には param "{{param}}" が必要です',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: パスフィルター "{{filter}}" は削除できません',
  'routing.listRoute.error.pathPattern':
    'useListRoute: パスパラメーターを変更するにはパスパターンが必要です',
  'routing.listRoute.error.page': 'useListRoute: page は正の安全な整数である必要があります',
  'routing.sveltekit.error.serverHistory':
    'history の移動はブラウザーでのみ利用できます: SvelteKit のクライアントルーターはサーバーサイドレンダリング中には実行されません',
}
