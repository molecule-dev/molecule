import type { RoutingTranslations } from './types.js'

/** Routing translations for Chinese. */
export const zh: RoutingTranslations = {
  'routing.error.missingParam': '路径 "{{name}}" 缺少参数 "{{pattern}}"',
  'routing.error.routeNotFound': '未找到路由 "{{name}}"',
  'routing.error.noNavigationRef': '导航引用未设置。请确保`MoleculeProvider`已挂载。',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter`必须在 React Router 路由器中使用。挂载`BrowserRouter`、`HashRouter`、`MemoryRouter`、`Router`或`RouterProvider`。',
  'routing.error.reactRouterHistoryBeforeRender':
    '在组件渲染之前就使用了 React Router history。请通过 MoleculeRouterProvider 或 useMoleculeRouter 将其挂载到 React Router 路由器内。',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize 必须是正的安全整数',
  'routing.listRoute.error.authRequired':
    'useListRoute: 受保护的选择需要 auth.status 和 auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: 未知的选择 "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: 未知的筛选器 "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: 路径筛选器 "{{filter}}" 需要参数 "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved': 'useListRoute: 路径筛选器 "{{filter}}" 无法移除',
  'routing.listRoute.error.pathPattern': 'useListRoute: 更改路径参数需要路径模式',
  'routing.listRoute.error.page': 'useListRoute: page 必须是正的安全整数',
  'routing.sveltekit.error.serverHistory':
    'history 移动仅在浏览器中可用：SvelteKit 客户端路由器在服务器端渲染期间不会运行',
}
