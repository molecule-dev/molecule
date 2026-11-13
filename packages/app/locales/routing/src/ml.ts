import type { RoutingTranslations } from './types.js'

/** Routing translations for Malayalam. */
export const ml: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" പാതയ്ക്ക് "{{pattern}}" പാരാമീറ്റർ കാണുന്നില്ല',
  'routing.error.routeNotFound': '"{{name}}" റൂട്ട് കണ്ടെത്തിയില്ല',
  'routing.error.noNavigationRef':
    'നാവിഗേഷൻ റഫറൻസ് സജ്ജീകരിച്ചിട്ടില്ല. `MoleculeProvider` മൗണ്ട് ചെയ്തിട്ടുണ്ടെന്ന് ഉറപ്പാക്കുക.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'ഒരു റിയാക്റ്റ് റൂട്ടർ റൂട്ടറിൽ `useMoleculeRouter` ഉപയോഗിക്കണം. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, അല്ലെങ്കിൽ `RouterProvider` എന്നിവ മൗണ്ട് ചെയ്യുക.',
  'routing.error.reactRouterHistoryBeforeRender':
    'അതിന്റെ ഘടകം റെൻഡർ ചെയ്യുന്നതിന് മുമ്പ് React Router ചരിത്രം ഉപയോഗിച്ചു. MoleculeRouterProvider അല്ലെങ്കിൽ useMoleculeRouter വഴി ഒരു React Router റൂട്ടറിൽ അത് മൗണ്ട് ചെയ്യുക.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize ഒരു പോസിറ്റീവ് സുരക്ഷിത പൂർണ്ണസംഖ്യ ആയിരിക്കണം',
  'routing.listRoute.error.authRequired':
    'useListRoute: സംരക്ഷിത തിരഞ്ഞെടുപ്പുകൾക്ക് auth.status, auth.redirectTo എന്നിവ ആവശ്യമാണ്',
  'routing.listRoute.error.unknownSelection':
    'useListRoute: അപരിചിതമായ തിരഞ്ഞെടുപ്പ് "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: അപരിചിതമായ ഫിൽറ്റർ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: പാത്ത് ഫിൽറ്റർ "{{filter}}"-ന് param "{{param}}" ആവശ്യമാണ്',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: പാത്ത് ഫിൽറ്റർ "{{filter}}" നീക്കം ചെയ്യാൻ കഴിയില്ല',
  'routing.listRoute.error.pathPattern':
    'useListRoute: പാത്ത് പാരാമീറ്ററുകൾ മാറ്റുന്നതിന് ഒരു പാത്ത് പാറ്റേൺ ആവശ്യമാണ്',
  'routing.listRoute.error.page':
    'useListRoute: page ഒരു പോസിറ്റീവ് സുരക്ഷിത പൂർണ്ണസംഖ്യ ആയിരിക്കണം',
  'routing.sveltekit.error.serverHistory':
    'ചരിത്ര നീക്കങ്ങൾ ബ്രൗസറിൽ മാത്രമേ ലഭ്യമാകൂ: SvelteKit ക്ലയന്റ് റൂട്ടർ സെർവർ-സൈഡ് റെൻഡറിംഗിനിടെ പ്രവർത്തിക്കുന്നില്ല',
}
