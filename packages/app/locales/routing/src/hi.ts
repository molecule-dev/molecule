import type { RoutingTranslations } from './types.js'

/** Routing translations for Hindi. */
export const hi: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" पथ के लिए "{{pattern}}" पैरामीटर गायब है',
  'routing.error.routeNotFound': 'रूट "{{name}}" नहीं मिला',
  'routing.error.noNavigationRef':
    'नेविगेशन संदर्भ सेट नहीं है। सुनिश्चित करें कि `MoleculeProvider` माउंटेड है।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` उपयोग React Router राउटर के भीतर किया जाना चाहिए। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` या `RouterProvider` माउंट करें।',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router हिस्ट्री का उपयोग इसके कंपोनेंट के रेंडर होने से पहले किया गया। MoleculeRouterProvider या useMoleculeRouter के माध्यम से इसे एक React Router राउटर के भीतर माउंट करें।',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize एक सकारात्मक सुरक्षित पूर्णांक होना चाहिए',
  'routing.listRoute.error.authRequired':
    'useListRoute: संरक्षित चयनों के लिए auth.status और auth.redirectTo आवश्यक हैं',
  'routing.listRoute.error.unknownSelection': 'useListRoute: अज्ञात चयन "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: अज्ञात फ़िल्टर "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: पाथ फ़िल्टर "{{filter}}" को पैरामीटर "{{param}}" की आवश्यकता है',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: पाथ फ़िल्टर "{{filter}}" को हटाया नहीं जा सकता',
  'routing.listRoute.error.pathPattern':
    'useListRoute: पाथ पैरामीटर बदलने के लिए एक पाथ पैटर्न आवश्यक है',
  'routing.listRoute.error.page': 'useListRoute: page एक सकारात्मक सुरक्षित पूर्णांक होना चाहिए',
  'routing.sveltekit.error.serverHistory':
    'हिस्ट्री मूव्स केवल ब्राउज़र में उपलब्ध हैं: SvelteKit क्लाइंट राउटर सर्वर-साइड रेंडरिंग के दौरान नहीं चलता',
}
