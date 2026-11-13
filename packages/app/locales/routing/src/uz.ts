import type { RoutingTranslations } from './types.js'

/** Routing translations for Uzbek. */
export const uz: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" yo\'li uchun "{{pattern}}" parametri topilmadi',
  'routing.error.routeNotFound': '"{{name}}" yo\'nalishi topilmadi',
  'routing.error.noNavigationRef':
    "Navigatsiya havolasi o'rnatilmagan. `MoleculeProvider` o'rnatilganligiga ishonch hosil qiling.",
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` React Router router ichida ishlatilishi kerak. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` yoki `RouterProvider` o'rnating.",
  'routing.error.reactRouterHistoryBeforeRender':
    "React Router tarixi uning komponenti renderlanishidan oldin ishlatilgan. Uni MoleculeRouterProvider yoki useMoleculeRouter orqali React Router router ichida o'rnating.",
  'routing.listRoute.error.pageSize':
    "useListRoute: pageSize musbat xavfsiz butun son bo'lishi kerak",
  'routing.listRoute.error.authRequired':
    'useListRoute: himoyalangan tanlovlar auth.status va auth.redirectTo talab qiladi',
  'routing.listRoute.error.unknownSelection': 'useListRoute: noma\'lum tanlov "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: noma\'lum filtr "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: yo\'l filtri "{{filter}}" param "{{param}}" talab qiladi',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: yo\'l filtri "{{filter}}" olib tashlanmaydi',
  'routing.listRoute.error.pathPattern':
    "useListRoute: yo'l parametrlarini o'zgartirish yo'l shablonini talab qiladi",
  'routing.listRoute.error.page': "useListRoute: page musbat xavfsiz butun son bo'lishi kerak",
  'routing.sveltekit.error.serverHistory':
    'tarix harakatlari faqat brauzerda mavjud: SvelteKit klient routeri server tomonda renderlash paytida ishlamaydi',
}
