import type { RoutingTranslations } from './types.js'

/** Routing translations for Finnish. */
export const fi: RoutingTranslations = {
  'routing.error.missingParam': 'Puuttuva parametri "{{name}}" polulle "{{pattern}}"',
  'routing.error.routeNotFound': 'Reittiä "{{name}}" ei löytynyt',
  'routing.error.noNavigationRef':
    'Navigointiviitettä ei ole asetettu. Varmista, että `MoleculeProvider` on liitetty.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` on käytettävä React Router -reitittimen sisällä. Liitä `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` tai `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Routerin historiaa käytettiin ennen sen komponentin renderöintiä. Liitä se MoleculeRouterProvider- tai useMoleculeRouter-kautta React Router -reitittimen sisälle.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize:n on oltava positiivinen turvallinen kokonaisluku',
  'routing.listRoute.error.authRequired':
    'useListRoute: suojatuilla valinnoilla on oltava auth.status ja auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: tuntematon valinta "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: tuntematon suodatin "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: polkusuodatin "{{filter}}" vaatii parametrin "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: polkusuodatinta "{{filter}}" ei voi poistaa',
  'routing.listRoute.error.pathPattern':
    'useListRoute: polkuparametrien muuttaminen vaatii polkumallin',
  'routing.listRoute.error.page':
    'useListRoute: page:n on oltava positiivinen turvallinen kokonaisluku',
  'routing.sveltekit.error.serverHistory':
    'historialiikkeet ovat käytettävissä vain selaimessa: SvelteKitin asiakasreititin ei käy palvelinpuolen renderöinnin aikana',
}
