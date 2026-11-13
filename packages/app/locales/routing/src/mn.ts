import type { RoutingTranslations } from './types.js'

/** Routing translations for Mongolian. */
export const mn: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" замд "{{pattern}}" параметр байхгүй байна',
  'routing.error.routeNotFound': '"{{name}}" маршрут олдсонгүй',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter-ийг MoleculeRouterProvider дотор ашиглах ёстой',
  'routing.error.noNavigationRef':
    'Навигацийн лавлагаа тохируулагдаагүй байна. `MoleculeProvider` холбогдсон эсэхийг шалгана уу.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router чиглүүлэгч дотор ашиглагдах ёстой. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, эсвэл `RouterProvider` холбоно уу.',
}
