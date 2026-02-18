import type { RoutingTranslations } from './types.js'

/** Routing translations for Hindi. */
export const hi: RoutingTranslations = {
  'routing.error.missingParam': '"{{pattern}}" पथ के लिए "{{name}}" पैरामीटर गायब है',
  'routing.error.routeNotFound': 'रूट "{{name}}" नहीं मिला',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter का उपयोग MoleculeRouterProvider के अंदर किया जाना चाहिए',
}
