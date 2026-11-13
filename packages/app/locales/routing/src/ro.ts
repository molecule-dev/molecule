import type { RoutingTranslations } from './types.js'

/** Routing translations for Romanian. */
export const ro: RoutingTranslations = {
  'routing.error.missingParam': 'Parametrul "{{name}}" lipsește pentru calea "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nu a fost găsită',
  'routing.error.noNavigationRef':
    'Referința de navigare nu este setată. Asigurați-vă că `MoleculeProvider` este montat.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` trebuie utilizat într-un router React Router. Se montează `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` sau `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Istoricul React Router a fost folosit înainte ca componenta sa fie randată. Montați-l în interiorul unui router React Router prin MoleculeRouterProvider sau useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize trebuie să fie un întreg sigur pozitiv',
  'routing.listRoute.error.authRequired':
    'useListRoute: selecțiile protejate necesită auth.status și auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: selecție necunoscută "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtru necunoscut "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filtrul de cale "{{filter}}" necesită parametrul "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filtrul de cale "{{filter}}" nu poate fi eliminat',
  'routing.listRoute.error.pathPattern':
    'useListRoute: modificarea parametrilor de cale necesită un model de cale',
  'routing.listRoute.error.page': 'useListRoute: page trebuie să fie un întreg sigur pozitiv',
  'routing.sveltekit.error.serverHistory':
    'mutările în istoric sunt disponibile doar în browser: routerul client SvelteKit nu rulează în timpul randării pe server',
}
