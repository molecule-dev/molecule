import type { RoutingTranslations } from './types.js'

/** Routing translations for German. */
export const de: RoutingTranslations = {
  'routing.error.missingParam': 'Fehlender Parameter "{{name}}" für Pfad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" nicht gefunden',
  'routing.error.noNavigationRef':
    'Navigationsreferenz nicht gesetzt. Stellen Sie sicher, dass `MoleculeProvider` eingebunden ist.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` muss innerhalb eines React Router-Routers verwendet werden. Mounten Sie `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` oder `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Die React Router-History wurde verwendet, bevor ihre Komponente gerendert wurde. Mounten Sie sie innerhalb eines React Router-Routers über MoleculeRouterProvider oder useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize muss eine positive sichere Ganzzahl sein',
  'routing.listRoute.error.authRequired':
    'useListRoute: geschützte Auswahlen erfordern auth.status und auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: unbekannte Auswahl "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: unbekannter Filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: Pfadfilter "{{filter}}" erfordert Param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: Pfadfilter "{{filter}}" kann nicht entfernt werden',
  'routing.listRoute.error.pathPattern':
    'useListRoute: das Ändern von Pfadparametern erfordert ein Pfadmuster',
  'routing.listRoute.error.page': 'useListRoute: page muss eine positive sichere Ganzzahl sein',
  'routing.sveltekit.error.serverHistory':
    'History-Bewegungen sind nur im Browser verfügbar: der SvelteKit-Client-Router läuft beim serverseitigen Rendern nicht',
}
