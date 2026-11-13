import type { RoutingTranslations } from './types.js'

/** Routing translations for Chinese. */
export const zh: RoutingTranslations = {
  'routing.error.missingParam': '路径 "{{name}}" 缺少参数 "{{pattern}}"',
  'routing.error.routeNotFound': '未找到路由 "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter 必须在 MoleculeRouterProvider 内部使用',
  'routing.error.noNavigationRef': '导航引用未设置。请确保`MoleculeProvider`已挂载。',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter`必须在 React Router 路由器中使用。挂载`BrowserRouter`、`HashRouter`、`MemoryRouter`、`Router`或`RouterProvider`。',
}
