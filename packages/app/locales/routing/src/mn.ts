import type { RoutingTranslations } from './types.js'

/** Routing translations for Mongolian. */
export const mn: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" замд "{{pattern}}" параметр байхгүй байна',
  'routing.error.routeNotFound': '"{{name}}" маршрут олдсонгүй',
  'routing.error.noNavigationRef':
    'Навигацийн лавлагаа тохируулагдаагүй байна. `MoleculeProvider` холбогдсон эсэхийг шалгана уу.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router чиглүүлэгч дотор ашиглагдах ёстой. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, эсвэл `RouterProvider` холбоно уу.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router түүхийг нь бүрүү дүрслэгдэхээс өмнө ашигласан байна. MoleculeRouterProvider эсвэл useMoleculeRouter дамжуулан React Router чиглүүлэгч дотор холбоно уу.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize эерэг, аюулгүй бүхэл тоо байх ёстой',
  'routing.listRoute.error.authRequired':
    'useListRoute: хамгаалсан сонголтууд auth.status болон auth.redirectTo шаардана',
  'routing.listRoute.error.unknownSelection': 'useListRoute: үл мэдэгдэх сонголт "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: үл мэдэгдэх шүүлтүүр "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: замын шүүлтүүр "{{filter}}" нь "{{param}}" параметрийг шаардана',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: замын шүүлтүүр "{{filter}}"-ийг устгах боломжгүй',
  'routing.listRoute.error.pathPattern':
    'useListRoute: замын параметрийг өөрчлөхөд замын хээ шаардлагатай',
  'routing.listRoute.error.page': 'useListRoute: page эерэг, аюулгүй бүхэл тоо байх ёстой',
  'routing.sveltekit.error.serverHistory':
    'түүхэн шилжилт зөвхөн хөтчид боломжтой: SvelteKit клиент чиглүүлэгч сервер талын дүрслэлийн үед ажиллахгүй',
}
