import type { RoutingTranslations } from './types.js'

/** Routing translations for Icelandic. */
export const is: RoutingTranslations = {
  'routing.error.missingParam': 'Vantar breytu "{{name}}" fyrir slóð "{{pattern}}"',
  'routing.error.routeNotFound': 'Leið "{{name}}" fannst ekki',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter verður að nota innan MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Tilvísun í flakkstillingu er ekki stillt. Gakktu úr skugga um að `MoleculeProvider` sé tengt.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` verður að nota innan React Router leiðara. Tengdu `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` eða `RouterProvider`.',
}
