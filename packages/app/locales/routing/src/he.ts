import type { RoutingTranslations } from './types.js'

/** Routing translations for Hebrew. */
export const he: RoutingTranslations = {
  'routing.error.missingParam': 'פרמטר "{{name}}" חסר עבור נתיב "{{pattern}}"',
  'routing.error.routeNotFound': 'הנתיב "{{name}}" לא נמצא',
  'routing.error.noNavigationRef': 'הפניה לניווט לא הוגדרה. ודא `MoleculeProvider` מותקן.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'יש להשתמש ב `useMoleculeRouter` בתוך נתב של React Router. יש להרכיב את `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, או `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'היסטוריית React Router שימשה לפני שהרכיב שלה עבר עיבוד. יש להרכיב אותה בתוך נתב של React Router דרך MoleculeRouterProvider או useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize חייב להיות מספר שלם בטוח וחיובי',
  'routing.listRoute.error.authRequired':
    'useListRoute: בחירות מוגנות דורשות auth.status ו-auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: בחירה לא מוכרת "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: מסנן לא מוכר "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: מסנן נתיב "{{filter}}" דורש param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: לא ניתן להסיר את מסנן הנתיב "{{filter}}"',
  'routing.listRoute.error.pathPattern': 'useListRoute: שינוי פרמטרים של נתיב מחייב תבנית נתיב',
  'routing.listRoute.error.page': 'useListRoute: page חייב להיות מספר שלם בטוח וחיובי',
  'routing.sveltekit.error.serverHistory':
    'פעולות היסטוריה זמינות רק בדפדפן: נתב הלקוח של SvelteKit אינו פועל במהלך עיבוד בצד השרת',
}
