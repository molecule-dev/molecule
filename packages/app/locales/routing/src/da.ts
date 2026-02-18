import type { RoutingTranslations } from './types.js'

/** Routing translations for Danish. */
export const da: RoutingTranslations = {
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" blev ikke fundet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter skal bruges inden for en MoleculeRouterProvider',
}
