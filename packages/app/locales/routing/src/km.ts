import type { RoutingTranslations } from './types.js'

/** Routing translations for Khmer. */
export const km: RoutingTranslations = {
  'routing.error.missingParam': 'ប៉ារ៉ាម៉ែត្រ "{{name}}" បាត់សម្រាប់ផ្លូវ "{{pattern}}"',
  'routing.error.routeNotFound': 'រកមិនឃើញផ្លូវ "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ត្រូវតែប្រើនៅក្នុង MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'ឯកសារយោងរុករកមិនត្រូវបានកំណត់ទេ។ ត្រូវប្រាកដថា `MoleculeProvider` ត្រូវបានម៉ោន។',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ត្រូវតែប្រើនៅក្នុងរ៉ោតទ័រ React Router។ ម៉ោន `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ឬ `RouterProvider` ។',
}
