import type { RoutingTranslations } from './types.js'

/** Routing translations for Lao. */
export const lo: RoutingTranslations = {
  'routing.error.missingParam': 'ຂາດພາຣາມິເຕີ "{{name}}" ສຳລັບເສັ້ນທາງ "{{pattern}}"',
  'routing.error.routeNotFound': 'ບໍ່ພົບເສັ້ນທາງ "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ຕ້ອງໃຊ້ພາຍໃນ MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'ບໍ່ໄດ້ຕັ້ງຄ່າການອ້າງອີງການນຳທາງ. ໃຫ້ແນ່ໃຈວ່າ `MoleculeProvider` ຖືກຕິດຕັ້ງແລ້ວ.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ຕ້ອງຖືກໃຊ້ພາຍໃນເຣົາເຕີ React Router. ຕິດຕັ້ງ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ຫຼື `RouterProvider`.',
}
