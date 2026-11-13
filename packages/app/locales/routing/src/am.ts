import type { RoutingTranslations } from './types.js'

/** Routing translations for Amharic. */
export const am: RoutingTranslations = {
  'routing.error.missingParam': 'ለመንገድ "{{name}}" "{{pattern}}" መለኪያ የለም',
  'routing.error.routeNotFound': '"{{name}}" መንገድ አልተገኘም',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter በ MoleculeRouterProvider ውስጥ መጠቀም አለበት',
  'routing.error.noNavigationRef': 'የአሰሳ ማጣቀሻው አልተዘጋጀም። `MoleculeProvider` መጫኑን ያረጋግጡ።',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` በReact Router ራውተር ውስጥ ጥቅም ላይ መዋል አለበት። `BrowserRouter` ፣ `HashRouter` ፣ `MemoryRouter` ፣ `Router` ወይም `RouterProvider` ማውንት።',
}
