import type { RoutingTranslations } from './types.js'

/** Routing translations for Czech. */
export const cs: RoutingTranslations = {
  'routing.error.missingParam': 'Chybějící parametr "{{name}}" pro cestu "{{pattern}}"',
  'routing.error.routeNotFound': 'Cesta "{{name}}" nebyla nalezena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter musí být použit uvnitř MoleculeRouterProvider',
}
