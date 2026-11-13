import type { RoutingTranslations } from './types.js'

/** Routing translations for Azerbaijani. */
export const az: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" yolu üçün "{{pattern}}" parametri yoxdur',
  'routing.error.routeNotFound': '"{{name}}" marşrutu tapılmadı',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider daxilində istifadə edilməlidir',
  'routing.error.noNavigationRef':
    'Naviqasiya istinadı təyin edilməyib. `MoleculeProvider` quraşdırıldığından əmin olun.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router router daxilində istifadə olunmalıdır. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` və ya `RouterProvider` quraşdırın.',
}
