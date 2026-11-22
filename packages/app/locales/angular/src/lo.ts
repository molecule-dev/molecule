import type { AngularTranslations } from './types.js'

/** Angular translations for Lao. */
export const lo: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ຕ້ອງໃຊ້ພາຍໃນ ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient ຕ້ອງຖືກນໍາໃຊ້ພາຍໃນ AuthProvider',
  'angular.error.oauthFailed': 'ການເຂົ້າສູ່ລະບົບ OAuth ລົ້ມເຫຼວ',
  'angular.error.unsupportedMethod': 'ວິທີການທີ່ບໍ່ຮອງຮັບ: {{method}}',
  'angular.error.useStoreOutsideProvider': 'ຕ້ອງໃຊ້ useStateProvider ພາຍໃນ StateProvider',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider ຕ້ອງໃຊ້ພາຍໃນ EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient ຕ້ອງໃຊ້ພາຍໃນ HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider ຕ້ອງໃຊ້ພາຍໃນ LoggerProvider',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider ຕ້ອງໃຊ້ພາຍໃນ PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'ບໍ່ມີເຣົາເຕີຢູ່ທີ່ນີ້. ເພີ່ມ `provideMoleculeRouter()` ຈາກພັນທະການກຳນົດເສັ້ນທາງ (`@molecule/app-routing-angular-router`) ໃສ່ຜູ້ໃຫ້ບໍລິການຂອງແອັບ, ຫຼັງຈາກ `provideRouter(routes)` ຂອງ Angular, ຫຼືສົ່ງ `router` ໄປຫາ `provideMolecule`. ຖ້າແອັບເຮັດສິ່ງນີ້ແລ້ວ, ພັນທະການກຳນົດເສັ້ນທາງຂອງມັນເກົ່າກວ່າພັນທະນີ້: ອັບເດດມັນ (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'ການເຊື່ອມໂຍງການກຳນົດເສັ້ນທາງນີ້ບໍ່ມີມຸມມອງທີ່ຖືກກຳນົດເສັ້ນທາງທີ່ຈະສະແດງຜົນຢູ່ທີ່ນີ້: ສົ່ງຕໍ່ໜ້າເວັບເປັນລູກແທນ. ຖ້າແອັບກຳນົດເສັ້ນທາງດ້ວຍ `@molecule/app-routing-angular-router`, ການເຊື່ອມຕໍ່ນັ້ນເກົ່າກວ່າການເຊື່ອມໂຍງນີ້: ອັບເດດມັນ (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider ຕ້ອງໃຊ້ພາຍໃນ StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ຕ້ອງໃຊ້ພາຍໃນ ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ຕ້ອງໃຊ້ພາຍໃນ WorkspaceProvider',
}
