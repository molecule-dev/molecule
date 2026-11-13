import type { RoutingTranslations } from './types.js'

/** Routing translations for Hungarian. */
export const hu: RoutingTranslations = {
  'routing.error.missingParam': 'Hiányzó "{{name}}" paraméter a(z) "{{pattern}}" útvonalhoz',
  'routing.error.routeNotFound': 'A(z) "{{name}}" útvonal nem található',
  'routing.error.useMoleculeRouterOutsideProvider':
    'A useMoleculeRouter-t egy MoleculeRouterProvider-en belül kell használni',
  'routing.error.noNavigationRef':
    'A navigációs hivatkozás nincs beállítva. Győződjön meg arról, hogy `MoleculeProvider` fel van csatolva.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` kell rendelkezni egy React Router routeren belül. Csatlakoztasd `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` vagy `RouterProvider` függvénnyel rendelkező objektumokat.',
}
