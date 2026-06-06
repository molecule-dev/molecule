import type { RoutingTranslations } from './types.js'

/** Routing translations for af. */
export const af: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" vir pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Roete "{{name}}" nie gevind nie',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter moet binne 'n MoleculeRouterProvider gebruik word.",
}
