/** Translation keys for the routing locale package. */
export type RoutingTranslationKey =
  | 'routing.error.missingParam'
  | 'routing.error.routeNotFound'
  | 'routing.error.useMoleculeRouterOutsideProvider'
  | 'routing.error.noNavigationRef'
  | 'routing.error.useMoleculeRouterOutsideRouter'

/** Translation record mapping routing keys to translated strings. */
export type RoutingTranslations = Record<RoutingTranslationKey, string>
