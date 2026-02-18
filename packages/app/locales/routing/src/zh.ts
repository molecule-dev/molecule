import type { RoutingTranslations } from './types.js'

/** Routing translations for Chinese. */
export const zh: RoutingTranslations = {
  'routing.error.missingParam': '路径 "{{pattern}}" 缺少参数 "{{name}}"',
  'routing.error.routeNotFound': '未找到路由 "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter 必须在 MoleculeRouterProvider 内部使用',
}
