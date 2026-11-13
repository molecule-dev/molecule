import type { RoutingTranslations } from './types.js'

/** Routing translations for Hindi. */
export const hi: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" पथ के लिए "{{pattern}}" पैरामीटर गायब है',
  'routing.error.routeNotFound': 'रूट "{{name}}" नहीं मिला',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter का उपयोग MoleculeRouterProvider के अंदर किया जाना चाहिए',
  'routing.error.noNavigationRef':
    'नेविगेशन संदर्भ सेट नहीं है। सुनिश्चित करें कि `MoleculeProvider` माउंटेड है।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` उपयोग React Router राउटर के भीतर किया जाना चाहिए। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` या `RouterProvider` माउंट करें।',
}
