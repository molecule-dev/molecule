import type { RoutingTranslations } from './types.js'

/** Routing translations for ig. */
export const ig: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Achọpụtaghị parameter "{{name}}" maka ụzọ "{{pattern}}"',
  'routing.error.routeNotFound': 'Ahụghị ụzọ "{{name}}"',
  'routing.error.noNavigationRef':
    "Edobeghị ntụaka nhazigharị. Hụ na etinyere `MoleculeProvider` n'elu ya.",
  'routing.error.useMoleculeRouterOutsideRouter':
    "A ga-eji `useMoleculeRouter` n'ime rawụta React Router. Wụnye `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ma ọ bụ `RouterProvider`.",
  'routing.error.reactRouterHistoryBeforeRender':
    "Eji akụkọ ndekọ React Router mee ihe tupu e kelee ngwaọrụ ya. Wụnye ya n'ime rawụta React Router site na MoleculeRouterProvider ma ọ bụ useMoleculeRouter.",
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize kwesịrị ịbụ ọnụọgụ zuru oke nke dị mma ma dị nchekwa',
  'routing.listRoute.error.authRequired':
    'useListRoute: nhọrọ ndị e chebere chọrọ auth.status na auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: nhọrọ a na-amaghị "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: nzacha a na-amaghị "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: nzacha ụzọ "{{filter}}" chọrọ param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: enweghị ike iwepụ nzacha ụzọ "{{filter}}"',
  'routing.listRoute.error.pathPattern': 'useListRoute: ịgbanwe parameta ụzọ chọrọ ụdị ụzọ',
  'routing.listRoute.error.page':
    'useListRoute: page kwesịrị ịbụ ọnụọgụ zuru oke nke dị mma ma dị nchekwa',
  'routing.sveltekit.error.serverHistory':
    "mmegharị akụkọ na-arụ ọrụ naanị na brauzer: rawụta onye ahịa SvelteKit anaghị agba ọsọ mgbe a na-ese ihe n'akụkụ sava",
}
