import type { RoutingTranslations } from './types.js'

/** Routing translations for Chinese (Traditional). */
export const zhTW: RoutingTranslations = {
  'routing.error.missingParam': '路徑 "{{pattern}}" 缺少參數 "{{name}}"',
  'routing.error.routeNotFound': '找不到路由 "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter 必須在 MoleculeRouterProvider 內部使用',
}
