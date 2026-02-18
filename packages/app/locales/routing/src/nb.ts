import type { RoutingTranslations } from './types.js'

/** Routing translations for Norwegian Bokmål. */
export const nb: RoutingTranslations = {
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" ble ikke funnet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter må brukes innenfor en MoleculeRouterProvider',
}
