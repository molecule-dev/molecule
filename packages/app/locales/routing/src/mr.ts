import type { RoutingTranslations } from './types.js'

/** Routing translations for Marathi. */
export const mr: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" मार्गासाठी "{{pattern}}" पॅरामीटर गहाळ आहे',
  'routing.error.routeNotFound': '"{{name}}" मार्ग सापडला नाही',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter हे MoleculeRouterProvider मध्ये वापरले जाणे आवश्यक आहे',
  'routing.error.noNavigationRef':
    'नेव्हिगेशन संदर्भ सेट केलेला नाही. `MoleculeProvider` माउंट केलेला असल्याची खात्री करा.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` वापर React Router राउटरमध्येच केला पाहिजे. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` किंवा `RouterProvider` माउंट करा.',
}
