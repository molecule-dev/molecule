import type { RoutingTranslations } from './types.js'

/** Routing translations for Swedish. */
export const sv: RoutingTranslations = {
  'routing.error.missingParam': 'Saknad parameter "{{name}}" för sökväg "{{pattern}}"',
  'routing.error.routeNotFound': 'Rutten "{{name}}" hittades inte',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter måste användas inom en MoleculeRouterProvider',
}
