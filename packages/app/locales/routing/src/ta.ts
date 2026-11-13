import type { RoutingTranslations } from './types.js'

/** Routing translations for Tamil. */
export const ta: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" பாதைக்கான "{{pattern}}" அளவுரு காணவில்லை',
  'routing.error.routeNotFound': '"{{name}}" வழி கண்டுபிடிக்கப்படவில்லை',
  'routing.error.noNavigationRef':
    'வழிசெலுத்தல் குறிப்பு அமைக்கப்படவில்லை. `MoleculeProvider` ஏற்றப்பட்டுள்ளதா என்பதை உறுதிப்படுத்தவும்.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ஒரு React Router ரௌட்டருக்குள் பயன்படுத்தப்பட வேண்டும். `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` அல்லது `RouterProvider` மவுண்ட் செய்யவும்.',
  'routing.error.reactRouterHistoryBeforeRender':
    'அதன் கூறு வரையப்படுவதற்கு முன் React Router வரலாறு பயன்படுத்தப்பட்டது. MoleculeRouterProvider அல்லது useMoleculeRouter வழியாக ஒரு React Router ரௌட்டருக்குள் அதை மவுண்ட் செய்யவும்.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize ஒரு நேர்மறை பாதுகாப்பான முழு எண்ணாக இருக்க வேண்டும்',
  'routing.listRoute.error.authRequired':
    'useListRoute: பாதுகாக்கப்பட்ட தேர்வுகளுக்கு auth.status மற்றும் auth.redirectTo தேவை',
  'routing.listRoute.error.unknownSelection': 'useListRoute: தெரியாத தேர்வு "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: தெரியாத வடிகட்டி "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: பாத் வடிகட்டி "{{filter}}"-க்கு param "{{param}}" தேவை',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: பாத் வடிகட்டி "{{filter}}" அகற்ற முடியாது',
  'routing.listRoute.error.pathPattern':
    'useListRoute: பாத் அளவுருக்களை மாற்ற ஒரு பாத் பேட்டர்ன் தேவை',
  'routing.listRoute.error.page':
    'useListRoute: page ஒரு நேர்மறை பாதுகாப்பான முழு எண்ணாக இருக்க வேண்டும்',
  'routing.sveltekit.error.serverHistory':
    'வரலாறு நகர்வுகள் பிரௌசரில் மட்டுமே கிடைக்கும்: SvelteKit கிளையன்ட் ரௌட்டர் சர்வர்-சைட் ரெண்டரிங்கின் போது இயங்காது',
}
