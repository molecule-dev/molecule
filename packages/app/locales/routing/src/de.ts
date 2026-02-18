import type { RoutingTranslations } from './types.js'

/** Routing translations for German. */
export const de: RoutingTranslations = {
  'routing.error.missingParam': 'Fehlender Parameter "{{name}}" für Pfad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" nicht gefunden',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter muss innerhalb eines MoleculeRouterProvider verwendet werden',
}
