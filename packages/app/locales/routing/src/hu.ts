import type { RoutingTranslations } from './types.js'

/** Routing translations for Hungarian. */
export const hu: RoutingTranslations = {
  'routing.error.missingParam': 'Hiányzó "{{name}}" paraméter a(z) "{{pattern}}" útvonalhoz',
  'routing.error.routeNotFound': 'A(z) "{{name}}" útvonal nem található',
  'routing.error.useMoleculeRouterOutsideProvider':
    'A useMoleculeRouter-t egy MoleculeRouterProvider-en belül kell használni',
}
