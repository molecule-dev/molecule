import type { RoutingTranslations } from './types.js'

/** Routing translations for Chinese (Traditional). */
export const zhTW: RoutingTranslations = {
  'routing.error.missingParam': '路徑 "{{name}}" 缺少參數 "{{pattern}}"',
  'routing.error.routeNotFound': '找不到路由 "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter 必須在 MoleculeRouterProvider 內部使用',
  'routing.error.noNavigationRef': '導航引用未設定。請確保`MoleculeProvider`已掛載。',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter`必須在 React Router 路由器中使用。掛載`BrowserRouter`、`HashRouter`、`MemoryRouter`、`Router`或`RouterProvider`。',
}
