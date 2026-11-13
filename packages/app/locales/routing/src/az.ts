import type { RoutingTranslations } from './types.js'

/** Routing translations for Azerbaijani. */
export const az: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" yolu üçün "{{pattern}}" parametri yoxdur',
  'routing.error.routeNotFound': '"{{name}}" marşrutu tapılmadı',
  'routing.error.noNavigationRef':
    'Naviqasiya istinadı təyin edilməyib. `MoleculeProvider` quraşdırıldığından əmin olun.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router router daxilində istifadə olunmalıdır. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` və ya `RouterProvider` quraşdırın.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router tarixçəsi onun komponenti göstərilməzdən əvvəl istifadə olunub. Onu MoleculeRouterProvider və ya useMoleculeRouter vasitəsilə React Router router daxilində quraşdırın.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize müsbət təhlükəsiz tam ədəd olmalıdır',
  'routing.listRoute.error.authRequired':
    'useListRoute: qorunan seçimlər auth.status və auth.redirectTo tələb edir',
  'routing.listRoute.error.unknownSelection': 'useListRoute: naməlum seçim "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: naməlum filtr "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: yol filtri "{{filter}}" param "{{param}}" tələb edir',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: yol filtri "{{filter}}" silinə bilməz',
  'routing.listRoute.error.pathPattern':
    'useListRoute: yol parametrlərinin dəyişdirilməsi yol şablonu tələb edir',
  'routing.listRoute.error.page': 'useListRoute: page müsbət təhlükəsiz tam ədəd olmalıdır',
  'routing.sveltekit.error.serverHistory':
    'tarixçə hərəkətləri yalnız brauzerdə mövcuddur: SvelteKit müştəri routeri server tərəfindəki göstərmə zamanı işləmir',
}
