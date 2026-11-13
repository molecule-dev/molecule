import type { RoutingTranslations } from './types.js'

/** Routing translations for Tamil. */
export const ta: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" பாதைக்கான "{{pattern}}" அளவுரு காணவில்லை',
  'routing.error.routeNotFound': '"{{name}}" வழி கண்டுபிடிக்கப்படவில்லை',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ஒரு MoleculeRouterProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'routing.error.noNavigationRef':
    'வழிசெலுத்தல் குறிப்பு அமைக்கப்படவில்லை. `MoleculeProvider` ஏற்றப்பட்டுள்ளதா என்பதை உறுதிப்படுத்தவும்.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ஒரு React Router ரௌட்டருக்குள் பயன்படுத்தப்பட வேண்டும். `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` அல்லது `RouterProvider` மவுண்ட் செய்யவும்.',
}
