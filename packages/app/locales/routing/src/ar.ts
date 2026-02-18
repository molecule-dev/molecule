import type { RoutingTranslations } from './types.js'

/** Routing translations for Arabic. */
export const ar: RoutingTranslations = {
  'routing.error.missingParam': 'المعامل "{{name}}" مفقود للمسار "{{pattern}}"',
  'routing.error.routeNotFound': 'المسار "{{name}}" غير موجود',
  'routing.error.useMoleculeRouterOutsideProvider':
    'يجب استخدام useMoleculeRouter داخل MoleculeRouterProvider',
}
