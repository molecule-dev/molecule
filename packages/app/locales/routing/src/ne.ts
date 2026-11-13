import type { RoutingTranslations } from './types.js'

/** Routing translations for Nepali. */
export const ne: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" बाटोको लागि "{{pattern}}" प्यारामिटर छैन',
  'routing.error.routeNotFound': '"{{name}}" मार्ग फेला परेन',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter लाई MoleculeRouterProvider भित्र प्रयोग गर्नुपर्छ',
  'routing.error.noNavigationRef':
    'नेभिगेसन सन्दर्भ सेट गरिएको छैन। `MoleculeProvider` माउन्ट गरिएको छ भनी सुनिश्चित गर्नुहोस्।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router राउटर भित्र प्रयोग गर्नुपर्छ। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, वा `RouterProvider` माउन्ट गर्नुहोस्।',
}
