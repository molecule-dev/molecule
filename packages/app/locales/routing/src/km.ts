import type { RoutingTranslations } from './types.js'

/** Routing translations for Khmer. */
export const km: RoutingTranslations = {
  'routing.error.missingParam': 'ប៉ារ៉ាម៉ែត្រ "{{name}}" បាត់សម្រាប់ផ្លូវ "{{pattern}}"',
  'routing.error.routeNotFound': 'រកមិនឃើញផ្លូវ "{{name}}"',
  'routing.error.noNavigationRef':
    'ឯកសារយោងរុករកមិនត្រូវបានកំណត់ទេ។ ត្រូវប្រាកដថា `MoleculeProvider` ត្រូវបានម៉ោន។',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ត្រូវតែប្រើនៅក្នុងរ៉ោតទ័រ React Router។ ម៉ោន `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ឬ `RouterProvider` ។',
  'routing.error.reactRouterHistoryBeforeRender':
    'ប្រវត្តិ React Router ត្រូវបានប្រើមុនពេលសមាសភាគរបស់វាបង្ហាញ។ ដំឡើងវានៅខាងក្នុងរ៉ោតទ័រ React Router តាមរយៈ MoleculeRouterProvider ឬ useMoleculeRouter។',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ត្រូវតែជាចំនួនគត់សុវត្ថិភាពវិជ្ជមាន',
  'routing.listRoute.error.authRequired':
    'useListRoute: ការជ្រើសរើសដែលបានការពារត្រូវការ auth.status និង auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ការជ្រើសរើសមិនស្គាល់ "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: តម្រងមិនស្គាល់ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: តម្រងផ្លូវ "{{filter}}" ត្រូវការ param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: មិនអាចដកតម្រងផ្លូវ "{{filter}}" ចេញទេ',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ការផ្លាស់ប្តូរប៉ារ៉ាម៉ែត្រផ្លូវត្រូវការគំរូផ្លូវ',
  'routing.listRoute.error.page': 'useListRoute: page ត្រូវតែជាចំនួនគត់សុវត្ថិភាពវិជ្ជមាន',
  'routing.sveltekit.error.serverHistory':
    'ការផ្លាស់ទីប្រវត្តិមានតែក្នុងកម្មវិធីរុករកប៉ុណ្ណោះ៖ រ៉ោតទ័រ client របស់ SvelteKit មិនដំណើរការក្នុងអំឡុងពេលបង្ហាញនៅផ្នែក server ទេ',
}
