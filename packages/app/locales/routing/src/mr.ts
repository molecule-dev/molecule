import type { RoutingTranslations } from './types.js'

/** Routing translations for Marathi. */
export const mr: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" मार्गासाठी "{{pattern}}" पॅरामीटर गहाळ आहे',
  'routing.error.routeNotFound': '"{{name}}" मार्ग सापडला नाही',
  'routing.error.noNavigationRef':
    'नेव्हिगेशन संदर्भ सेट केलेला नाही. `MoleculeProvider` माउंट केलेला असल्याची खात्री करा.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` वापर React Router राउटरमध्येच केला पाहिजे. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` किंवा `RouterProvider` माउंट करा.',
  'routing.error.reactRouterHistoryBeforeRender':
    'त्याच्या कंपोनंट रेंडर होण्यापूर्वी React Router हिस्ट्रीचा वापर केला गेला. MoleculeRouterProvider किंवा useMoleculeRouter द्वारे React Router राउटरमध्ये तो माउंट करा.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize सकारात्मक सुरक्षित पूर्णांक असणे आवश्यक आहे',
  'routing.listRoute.error.authRequired':
    'useListRoute: संरक्षित निवडींना auth.status आणि auth.redirectTo आवश्यक आहे',
  'routing.listRoute.error.unknownSelection': 'useListRoute: अज्ञात निवड "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: अज्ञात फिल्टर "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: पाथ फिल्टर "{{filter}}" ला param "{{param}}" आवश्यक आहे',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: पाथ फिल्टर "{{filter}}" काढता येत नाही',
  'routing.listRoute.error.pathPattern':
    'useListRoute: पाथ पॅरामीटर्स बदलण्यासाठी पाथ पॅटर्न आवश्यक आहे',
  'routing.listRoute.error.page': 'useListRoute: page सकारात्मक सुरक्षित पूर्णांक असणे आवश्यक आहे',
  'routing.sveltekit.error.serverHistory':
    'हिस्ट्री मूव्स फक्त ब्राउझरमध्ये उपलब्ध आहेत: SvelteKit क्लायंट राउटर सर्व्हर-साइड रेंडरिंगदरम्यान चालत नाही',
}
