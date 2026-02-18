import type { RoutingTranslations } from './types.js'

/** Routing translations for Thai. */
export const th: RoutingTranslations = {
  'routing.error.missingParam': 'พารามิเตอร์ "{{name}}" หายไปสำหรับเส้นทาง "{{pattern}}"',
  'routing.error.routeNotFound': 'ไม่พบเส้นทาง "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ต้องใช้ภายใน MoleculeRouterProvider',
}
