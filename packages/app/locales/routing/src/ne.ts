import type { RoutingTranslations } from './types.js'

/** Routing translations for Nepali. */
export const ne: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" बाटोको लागि "{{pattern}}" प्यारामिटर छैन',
  'routing.error.routeNotFound': '"{{name}}" मार्ग फेला परेन',
  'routing.error.noNavigationRef':
    'नेभिगेसन सन्दर्भ सेट गरिएको छैन। `MoleculeProvider` माउन्ट गरिएको छ भनी सुनिश्चित गर्नुहोस्।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router राउटर भित्र प्रयोग गर्नुपर्छ। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, वा `RouterProvider` माउन्ट गर्नुहोस्।',
  'routing.error.reactRouterHistoryBeforeRender':
    'यसको कम्पोनेन्ट रेन्डर हुनु अघि React Router हिस्ट्री प्रयोग गरिएको थियो। MoleculeRouterProvider वा useMoleculeRouter मार्फत React Router राउटर भित्र यसलाई माउन्ट गर्नुहोस्।',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize सकारात्मक सुरक्षित पूर्णाङ्क हुनुपर्छ',
  'routing.listRoute.error.authRequired':
    'useListRoute: सुरक्षित चयनहरूलाई auth.status र auth.redirectTo चाहिन्छ',
  'routing.listRoute.error.unknownSelection': 'useListRoute: अज्ञात चयन "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: अज्ञात फिल्टर "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: पाथ फिल्टर "{{filter}}" लाई param "{{param}}" चाहिन्छ',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: पाथ फिल्टर "{{filter}}" हटाउन सकिँदैन',
  'routing.listRoute.error.pathPattern':
    'useListRoute: पाथ प्यारामिटर परिवर्तन गर्न पाथ प्याटर्न चाहिन्छ',
  'routing.listRoute.error.page': 'useListRoute: page सकारात्मक सुरक्षित पूर्णाङ्क हुनुपर्छ',
  'routing.sveltekit.error.serverHistory':
    'हिस्ट्री मुभहरू ब्राउजरमा मात्र उपलब्ध छन्: SvelteKit क्लाइन्ट राउटर सर्भर-साइड रेन्डरिङको समयमा चल्दैन',
}
