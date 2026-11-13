import type { RoutingTranslations } from './types.js'

/** Routing translations for Malayalam. */
export const ml: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" പാതയ്ക്ക് "{{pattern}}" പാരാമീറ്റർ കാണുന്നില്ല',
  'routing.error.routeNotFound': '"{{name}}" റൂട്ട് കണ്ടെത്തിയില്ല',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ഒരു MoleculeRouterProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'routing.error.noNavigationRef':
    'നാവിഗേഷൻ റഫറൻസ് സജ്ജീകരിച്ചിട്ടില്ല. `MoleculeProvider` മൗണ്ട് ചെയ്തിട്ടുണ്ടെന്ന് ഉറപ്പാക്കുക.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'ഒരു റിയാക്റ്റ് റൂട്ടർ റൂട്ടറിൽ `useMoleculeRouter` ഉപയോഗിക്കണം. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, അല്ലെങ്കിൽ `RouterProvider` എന്നിവ മൗണ്ട് ചെയ്യുക.',
}
