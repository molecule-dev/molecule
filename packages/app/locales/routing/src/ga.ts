import type { RoutingTranslations } from './types.js'

/** Routing translations for Irish. */
export const ga: RoutingTranslations = {
  'routing.error.missingParam': 'Paraiméadar "{{name}}" ar iarraidh don chosán "{{pattern}}"',
  'routing.error.routeNotFound': 'Níor aimsíodh an bealach "{{name}}"',
  'routing.error.noNavigationRef':
    'Níl an tagairt nascleanúna socraithe. Cinntigh go bhfuil `MoleculeProvider` feistithe.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'Ní mór `useMoleculeRouter` a úsáid laistigh de ródaire React Router. Suiteáil `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, nó `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Úsáideadh stair React Router ar dtús, sula raibh a comhpháirt ullamh. Suiteáil é laistigh de ródaire React Router trí MoleculeRouterProvider nó useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: caithfidh pageSize a bheith ina uimhir shlán thearfach shábháilte',
  'routing.listRoute.error.authRequired':
    'useListRoute: éilíonn roghanna cosanta auth.status agus auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: rogha anaithnid "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: scagaire anaithnid "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: éilíonn an scagaire cosáin "{{filter}}" an param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ní féidir an scagaire cosáin "{{filter}}" a bhaint',
  'routing.listRoute.error.pathPattern':
    'useListRoute: éilíonn athrú ar pharaiméadair chosáin patrún cosáin',
  'routing.listRoute.error.page':
    'useListRoute: caithfidh page a bheith ina uimhir shlán thearfach shábháilte',
  'routing.sveltekit.error.serverHistory':
    'níl beirithe staire ar fáil ach sa bhrabhsálaí: ní ritheann ródaire cliaint SvelteKit le linn cur i láthair ar thaobh an fhreastalaí',
}
