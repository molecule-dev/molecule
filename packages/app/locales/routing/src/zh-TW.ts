import type { RoutingTranslations } from './types.js'

/** Routing translations for Chinese (Traditional). */
export const zhTW: RoutingTranslations = {
  'routing.error.missingParam': '路徑 "{{name}}" 缺少參數 "{{pattern}}"',
  'routing.error.routeNotFound': '找不到路由 "{{name}}"',
  'routing.error.noNavigationRef': '導航引用未設定。請確保`MoleculeProvider`已掛載。',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter`必須在 React Router 路由器中使用。掛載`BrowserRouter`、`HashRouter`、`MemoryRouter`、`Router`或`RouterProvider`。',
  'routing.error.reactRouterHistoryBeforeRender':
    '在元件渲染之前就使用了 React Router history。請透過 MoleculeRouterProvider 或 useMoleculeRouter 將其掛載到 React Router 路由器內。',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize 必須是正的安全整數',
  'routing.listRoute.error.authRequired':
    'useListRoute: 受保護的選擇需要 auth.status 和 auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: 未知的選擇 "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: 未知的篩選器 "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: 路徑篩選器 "{{filter}}" 需要參數 "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved': 'useListRoute: 路徑篩選器 "{{filter}}" 無法移除',
  'routing.listRoute.error.pathPattern': 'useListRoute: 變更路徑參數需要路徑模式',
  'routing.listRoute.error.page': 'useListRoute: page 必須是正的安全整數',
  'routing.sveltekit.error.serverHistory':
    'history 移動僅在瀏覽器中可用：SvelteKit 用戶端路由器在伺服器端渲染期間不會執行',
}
