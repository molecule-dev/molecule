import type { RoutingTranslations } from './types.js'

/** Routing translations for Hebrew. */
export const he: RoutingTranslations = {
  'routing.error.missingParam': 'פרמטר "{{name}}" חסר עבור נתיב "{{pattern}}"',
  'routing.error.routeNotFound': 'הנתיב "{{name}}" לא נמצא',
  'routing.error.useMoleculeRouterOutsideProvider':
    'יש להשתמש ב-useMoleculeRouter בתוך MoleculeRouterProvider',
  'routing.error.noNavigationRef': 'הפניה לניווט לא הוגדרה. ודא `MoleculeProvider` מותקן.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'יש להשתמש ב `useMoleculeRouter` בתוך נתב של React Router. יש להרכיב את `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, או `RouterProvider`.',
}
