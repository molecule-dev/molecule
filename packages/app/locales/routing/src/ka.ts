import type { RoutingTranslations } from './types.js'

/** Routing translations for Georgian. */
export const ka: RoutingTranslations = {
  'routing.error.missingParam': 'პარამეტრი "{{name}}" არ არის ბილიკისთვის "{{pattern}}"',
  'routing.error.routeNotFound': 'მარშრუტი "{{name}}" ვერ მოიძებნა',
  'routing.error.noNavigationRef':
    'ნავიგაციის მითითება დაყენებული არ არის. დარწმუნდით, რომ `MoleculeProvider` დამონტაჟებულია.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` უნდა იქნას გამოყენებული React Router-ის როუტერში. დაამონტაჟეთ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ან `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router-ის ისტორია გამოიყენეს მისი კომპონენტის რენდერამდე. დაამონტაჟეთ ის React Router-ის როუტერში MoleculeRouterProvider-ის ან useMoleculeRouter-ის მეშვეობით.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize უნდა იყოს დადებითი უსაფრთხო მთელი რიცხვი',
  'routing.listRoute.error.authRequired':
    'useListRoute: დაცული შერჩევები საჭიროებენ auth.status-ს და auth.redirectTo-ს',
  'routing.listRoute.error.unknownSelection': 'useListRoute: უცნობი შერჩევა "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: უცნობი ფილტრი "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ბილიკის ფილტრი "{{filter}}" საჭიროებს პარამეტრს "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ბილიკის ფილტრი "{{filter}}" ვერ წაიშლება',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ბილიკის პარამეტრების შეცვლა საჭიროებს ბილიკის შაბლონს',
  'routing.listRoute.error.page': 'useListRoute: page უნდა იყოს დადებითი უსაფრთხო მთელი რიცხვი',
  'routing.sveltekit.error.serverHistory':
    'ისტორიის გადაადგილებები ხელმისაწვდომია მხოლოდ ბრაუზერში: SvelteKit-ის კლიენტის როუტერი არ მუშაობს სერვერის მხარეს რენდერის დროს',
}
