import type { RoutingTranslations } from './types.js'

/** Routing translations for Kannada. */
export const kn: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" ಮಾರ್ಗಕ್ಕೆ "{{pattern}}" ಪ್ಯಾರಾಮೀಟರ್ ಕಾಣೆಯಾಗಿದೆ',
  'routing.error.routeNotFound': '"{{name}}" ಮಾರ್ಗ ಕಂಡುಬಂದಿಲ್ಲ',
  'routing.error.noNavigationRef':
    'ನ್ಯಾವಿಗೇಷನ್ ಉಲ್ಲೇಖವನ್ನು ಹೊಂದಿಸಲಾಗಿಲ್ಲ. `MoleculeProvider` ಅನ್ನು ಅಳವಡಿಸಲಾಗಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ರಿಯಾಕ್ಟ್ ರೂಟರ್ ರೂಟರ್‌ನಲ್ಲಿ ಬಳಸಬೇಕು. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ಅಥವಾ `RouterProvider` ಮೌಂಟ್ ಮಾಡಿ.',
  'routing.error.reactRouterHistoryBeforeRender':
    'ಅದರ ಘಟಕ ರೆಂಡರ್ ಆಗುವ ಮೊದಲೇ React Router ಇತಿಹಾಸವನ್ನು ಬಳಸಲಾಗಿದೆ. MoleculeRouterProvider ಅಥವಾ useMoleculeRouter ಮೂಲಕ ಅದನ್ನು React Router ರೂಟರ್ ಒಳಗೆ ಮೌಂಟ್ ಮಾಡಿ.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ಧನಾತ್ಮಕ ಸುರಕ್ಷಿತ ಪೂರ್ಣಾಂಕ ಆಗಿರಬೇಕು',
  'routing.listRoute.error.authRequired':
    'useListRoute: ಸಂರಕ್ಷಿತ ಆಯ್ಕೆಗಳಿಗೆ auth.status ಮತ್ತು auth.redirectTo ಬೇಕು',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ಅಪರಿಚಿತ ಆಯ್ಕೆ "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ಅಪರಿಚಿತ ಫಿಲ್ಟರ್ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ಪಾಥ್ ಫಿಲ್ಟರ್ "{{filter}}" ಗೆ param "{{param}}" ಬೇಕು',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ಪಾಥ್ ಫಿಲ್ಟರ್ "{{filter}}" ಅನ್ನು ತೆಗೆದುಹಾಕಲು ಸಾಧ್ಯವಿಲ್ಲ',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ಪಾಥ್ ಪ್ಯಾರಾಮೀಟರ್‌ಗಳನ್ನು ಬದಲಾಯಿಸಲು ಪಾಥ್ ಪ್ಯಾಟರ್ನ್ ಬೇಕು',
  'routing.listRoute.error.page': 'useListRoute: page ಧನಾತ್ಮಕ ಸುರಕ್ಷಿತ ಪೂರ್ಣಾಂಕ ಆಗಿರಬೇಕು',
  'routing.sveltekit.error.serverHistory':
    'ಇತಿಹಾಸ ಚಲನೆಗಳು ಕೇವಲ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿದೆ: SvelteKit ಕ್ಲೈಂಟ್ ರೂಟರ್ ಸರ್ವರ್-ಸೈಡ್ ರೆಂಡರಿಂಗ್ ಸಮಯದಲ್ಲಿ ಚಲಿಸುವುದಿಲ್ಲ',
}
