import type { RoutingTranslations } from './types.js'

/** Routing translations for Italian. */
export const it: RoutingTranslations = {
  'routing.error.missingParam': 'Parametro "{{name}}" mancante per il percorso "{{pattern}}"',
  'routing.error.routeNotFound': 'Percorso "{{name}}" non trovato',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter deve essere utilizzato all'interno di un MoleculeRouterProvider",
}
