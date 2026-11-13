import type { RoutingTranslations } from './types.js'

/** Routing translations for Amharic. */
export const am: RoutingTranslations = {
  'routing.error.missingParam': 'ለመንገድ "{{name}}" "{{pattern}}" መለኪያ የለም',
  'routing.error.routeNotFound': '"{{name}}" መንገድ አልተገኘም',
  'routing.error.noNavigationRef': 'የአሰሳ ማጣቀሻው አልተዘጋጀም። `MoleculeProvider` መጫኑን ያረጋግጡ።',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` በReact Router ራውተር ውስጥ ጥቅም ላይ መዋል አለበት። `BrowserRouter` ፣ `HashRouter` ፣ `MemoryRouter` ፣ `Router` ወይም `RouterProvider` ማውንት።',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router ታሪክ ከአካሉ ክፍል ከመታየቱ በፊት ጥቅም ላይ መዋሉ ተገኝቷል። በMoleculeRouterProvider ወይም useMoleculeRouter በአንድ React Router ራውተር ውስጥ ያስቀምጡት።',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize አዎንታዊ እና ደህንነቱ የተጠበቀ ሙሉ ቁጥር መሆን አለበት',
  'routing.listRoute.error.authRequired':
    'useListRoute: የተጠበቁ ምርጫዎች auth.status እና auth.redirectTo ያስፈልጋቸዋል',
  'routing.listRoute.error.unknownSelection': 'useListRoute: የማይታወቅ ምርጫ "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: የማይታወቅ ማጣሪያ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: የመንገድ ማጣሪያ "{{filter}}" param "{{param}}" ያስፈልገዋል',
  'routing.listRoute.error.pathFilterRemoved': 'useListRoute: የመንገድ ማጣሪያ "{{filter}}" ማስወገድ አይቻልም',
  'routing.listRoute.error.pathPattern': 'useListRoute: የመንገድ መለኪያዎችን መለወጥ የመንገድ ንድፍ ያስፈልገዋል',
  'routing.listRoute.error.page': 'useListRoute: page አዎንታዊ እና ደህንነቱ የተጠበቀ ሙሉ ቁጥር መሆን አለበት',
  'routing.sveltekit.error.serverHistory':
    'የታሪክ እንቅስቃሴዎች በአሳሽ ውስጥ ብቻ ይገኛሉ፦ የSvelteKit ደንበኛ ራውተር በአገልጋይ ጎን በሚታየትበት ወቅት አይንቀሳቀስም።',
}
