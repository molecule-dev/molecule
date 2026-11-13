import type { RoutingTranslations } from './types.js'

/** Routing translations for Kannada. */
export const kn: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" ಮಾರ್ಗಕ್ಕೆ "{{pattern}}" ಪ್ಯಾರಾಮೀಟರ್ ಕಾಣೆಯಾಗಿದೆ',
  'routing.error.routeNotFound': '"{{name}}" ಮಾರ್ಗ ಕಂಡುಬಂದಿಲ್ಲ',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ಅನ್ನು MoleculeRouterProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'routing.error.noNavigationRef':
    'ನ್ಯಾವಿಗೇಷನ್ ಉಲ್ಲೇಖವನ್ನು ಹೊಂದಿಸಲಾಗಿಲ್ಲ. `MoleculeProvider` ಅನ್ನು ಅಳವಡಿಸಲಾಗಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ರಿಯಾಕ್ಟ್ ರೂಟರ್ ರೂಟರ್‌ನಲ್ಲಿ ಬಳಸಬೇಕು. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ಅಥವಾ `RouterProvider` ಮೌಂಟ್ ಮಾಡಿ.',
}
