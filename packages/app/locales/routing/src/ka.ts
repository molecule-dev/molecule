import type { RoutingTranslations } from './types.js'

/** Routing translations for Georgian. */
export const ka: RoutingTranslations = {
  'routing.error.missingParam': 'პარამეტრი "{{name}}" არ არის ბილიკისთვის "{{pattern}}"',
  'routing.error.routeNotFound': 'მარშრუტი "{{name}}" ვერ მოიძებნა',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter უნდა გამოიყენოთ MoleculeRouterProvider-ის შიგნით',
  'routing.error.noNavigationRef':
    'ნავიგაციის მითითება დაყენებული არ არის. დარწმუნდით, რომ `MoleculeProvider` დამონტაჟებულია.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` უნდა იქნას გამოყენებული React Router-ის როუტერში. დაამონტაჟეთ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ან `RouterProvider`.',
}
