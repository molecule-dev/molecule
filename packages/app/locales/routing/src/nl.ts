import type { RoutingTranslations } from './types.js'

/** Routing translations for Dutch. */
export const nl: RoutingTranslations = {
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" voor pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" niet gevonden',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter moet binnen een MoleculeRouterProvider worden gebruikt',
}
