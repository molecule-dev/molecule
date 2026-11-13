import type { RoutingTranslations } from './types.js'

/** Routing translations for Lao. */
export const lo: RoutingTranslations = {
  'routing.error.missingParam': 'ຂາດພາຣາມິເຕີ "{{name}}" ສຳລັບເສັ້ນທາງ "{{pattern}}"',
  'routing.error.routeNotFound': 'ບໍ່ພົບເສັ້ນທາງ "{{name}}"',
  'routing.error.noNavigationRef':
    'ບໍ່ໄດ້ຕັ້ງຄ່າການອ້າງອີງການນຳທາງ. ໃຫ້ແນ່ໃຈວ່າ `MoleculeProvider` ຖືກຕິດຕັ້ງແລ້ວ.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ຕ້ອງຖືກໃຊ້ພາຍໃນເຣົາເຕີ React Router. ຕິດຕັ້ງ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ຫຼື `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'ໃຊ້ປະຫວັດ React Router ກ່ອນທີ່ອົງປະກອບຂອງມັນຈະເຣັນເດີ. ເມົານຕ໌ມັນພາຍໃນເຣົາເຕີ React Router ຜ່ານ MoleculeRouterProvider ຫຼື useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ຕ້ອງເປັນຈຳນວນເຕັມບວກທີ່ປອດໄພ',
  'routing.listRoute.error.authRequired':
    'useListRoute: ການເລືອກທີ່ມີການປ້ອງກັນຕ້ອງມີ auth.status ແລະ auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ການເລືອກທີ່ບໍ່ຮູ້ຈັກ "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ຕົວກອງທີ່ບໍ່ຮູ້ຈັກ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ຕົວກອງເສັ້ນທາງ "{{filter}}" ຕ້ອງມີ param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ບໍ່ສາມາດເອົາຕົວກອງເສັ້ນທາງ "{{filter}}" ອອກໄດ້',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ການປ່ຽນພາລາມິເຕີເສັ້ນທາງຕ້ອງມີຮູບແບບເສັ້ນທາງ',
  'routing.listRoute.error.page': 'useListRoute: page ຕ້ອງເປັນຈຳນວນເຕັມບວກທີ່ປອດໄພ',
  'routing.sveltekit.error.serverHistory':
    'ການເຄື່ອນຍ້າຍປະຫວັດມີພຽງແຕ່ໃນບຣາວເຊີເທົ່ານັ້ນ: ເຣົາເຕີ client ຂອງ SvelteKit ບໍ່ເຮັດວຽກໃນເວລາເຣັນເດີຢູ່ຝັ່ງ server',
}
