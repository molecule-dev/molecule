import type { RoutingTranslations } from './types.js'

/** Routing translations for Gujarati. */
export const gu: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" પાથ માટે "{{pattern}}" પેરામીટર ખૂટે છે',
  'routing.error.routeNotFound': '"{{name}}" રૂટ મળ્યું નથી',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter નો ઉપયોગ MoleculeRouterProvider ની અંદર થવો જોઈએ',
  'routing.error.noNavigationRef':
    'નેવિગેશન સંદર્ભ સેટ નથી. ખાતરી કરો કે `MoleculeProvider` માઉન્ટ થયેલ છે.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ઉપયોગ React Router રાઉટરમાં થવો જોઈએ. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, અથવા `RouterProvider` માઉન્ટ કરો.',
}
