import type { RoutingTranslations } from './types.js'

/** Routing translations for English. */
export const en: RoutingTranslations = {
  'routing.error.missingParam': 'Missing param "{{name}}" for path "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" not found',
  'routing.error.noNavigationRef': 'Navigation ref not set. Ensure `MoleculeProvider` is mounted.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` must be used within a React Router router. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, or `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'The React Router history was used before its component rendered. Mount it inside a React Router router through MoleculeRouterProvider or useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize must be a positive safe integer',
  'routing.listRoute.error.authRequired':
    'useListRoute: protected selections require auth.status and auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: unknown selection "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: unknown filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: path filter "{{filter}}" requires param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: path filter "{{filter}}" cannot be removed',
  'routing.listRoute.error.pathPattern':
    'useListRoute: changing path parameters requires a path pattern',
  'routing.listRoute.error.page': 'useListRoute: page must be a positive safe integer',
  'routing.sveltekit.error.serverHistory':
    'history moves are only available in the browser: the SvelteKit client router does not run during server-side rendering',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` must be called in an injection context of an Angular app that provides the router. Add `provideRouter(routes)` to the app's providers.",
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` must be called in a component's `setup` of a Vue app with Vue Router installed. Install it with `app.use(router)`.",
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` must be used within a Solid Router router. Mount `Router`, `HashRouter` or `MemoryRouter`.',
  'routing.sveltekit.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` must be used inside a `MoleculeRouterProvider`. Render `MoleculeRouterProvider` in your root layout, around the page.',
}
