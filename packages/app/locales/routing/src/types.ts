/** Translation keys for the routing locale package. */
export type RoutingTranslationKey =
  | 'routing.error.missingParam'
  | 'routing.error.routeNotFound'
  | 'routing.error.noNavigationRef'
  | 'routing.error.useMoleculeRouterOutsideRouter'
  | 'routing.error.reactRouterHistoryBeforeRender'
  | 'routing.listRoute.error.pageSize'
  | 'routing.listRoute.error.authRequired'
  | 'routing.listRoute.error.unknownSelection'
  | 'routing.listRoute.error.unknownFilter'
  | 'routing.listRoute.error.pathFilterParam'
  | 'routing.listRoute.error.pathFilterRemoved'
  | 'routing.listRoute.error.pathPattern'
  | 'routing.listRoute.error.page'
  | 'routing.sveltekit.error.serverHistory'

/** Translation record mapping routing keys to translated strings. */
export type RoutingTranslations = Record<RoutingTranslationKey, string>
