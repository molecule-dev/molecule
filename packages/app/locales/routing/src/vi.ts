import type { RoutingTranslations } from './types.js'

/** Routing translations for Vietnamese. */
export const vi: RoutingTranslations = {
  'routing.error.missingParam': 'Thiếu tham số "{{name}}" cho đường dẫn "{{pattern}}"',
  'routing.error.routeNotFound': 'Không tìm thấy tuyến đường "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter phải được sử dụng bên trong MoleculeRouterProvider',
}
