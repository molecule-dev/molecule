import type { RoutingTranslations } from './types.js'

/** Routing translations for Polish. */
export const pl: RoutingTranslations = {
  'routing.error.missingParam': 'Brakujący parametr "{{name}}" dla ścieżki "{{pattern}}"',
  'routing.error.routeNotFound': 'Trasa "{{name}}" nie została znaleziona',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter musi być używany wewnątrz MoleculeRouterProvider',
}
