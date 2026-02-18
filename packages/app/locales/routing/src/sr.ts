import type { RoutingTranslations } from './types.js'

/** Routing translations for Serbian. */
export const sr: RoutingTranslations = {
  'routing.error.missingParam': 'Недостаје параметар "{{name}}" за путању "{{pattern}}"',
  'routing.error.routeNotFound': 'Путања "{{name}}" није пронађена',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter мора да се користи унутар MoleculeRouterProvider',
}
