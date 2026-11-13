import type { RoutingTranslations } from './types.js'

/** Routing translations for Uzbek. */
export const uz: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" yo\'li uchun "{{pattern}}" parametri topilmadi',
  'routing.error.routeNotFound': '"{{name}}" yo\'nalishi topilmadi',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider ichida ishlatilishi kerak',
  'routing.error.noNavigationRef':
    "Navigatsiya havolasi o'rnatilmagan. `MoleculeProvider` o'rnatilganligiga ishonch hosil qiling.",
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` React Router router ichida ishlatilishi kerak. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` yoki `RouterProvider` o'rnating.",
}
