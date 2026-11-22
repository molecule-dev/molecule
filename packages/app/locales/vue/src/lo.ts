import type { VueTranslations } from './types.js'

/** Vue translations for Lao. */
export const lo: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ບໍ່ມີເຣົາເຕີຢູ່ທີ່ນີ້. ຫໍ່ແອັບດ້ວຍ `MoleculeRouterProvider` ຈາກການເຊື່ອມໂຍງການກຳນົດເສັ້ນທາງ (`@molecule/app-routing-vue-router`), ຫຼືສົ່ງ `router` ໄປຫາ `moleculePlugin`. ຖ້າແອັບເຮັດສິ່ງນີ້ແລ້ວ, ການເຊື່ອມໂຍງການກຳນົດເສັ້ນທາງຂອງມັນເກົ່າກວ່າການເຊື່ອມໂຍງນີ້: ອັບເດດມັນ (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'ການເຊື່ອມໂຍງການກຳນົດເສັ້ນທາງນີ້ບໍ່ມີມຸມມອງທີ່ຖືກກຳນົດເສັ້ນທາງທີ່ຈະສະແດງຢູ່ນີ້: ສົ່ງຕໍ່ໜ້າເວັບເປັນມຸມມອງລູກແທນ. ຖ້າແອັບກຳນົດເສັ້ນທາງດ້ວຍ `@molecule/app-routing-vue-router`, ການເຊື່ອມຕໍ່ນັ້ນເກົ່າກວ່າການເຊື່ອມໂຍງນີ້: ອັບເດດມັນ (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider ຕ້ອງໃຊ້ພາຍໃນ StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ຕ້ອງໃຊ້ພາຍໃນ ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient ຕ້ອງໃຊ້ພາຍໃນ AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider ຕ້ອງໃຊ້ພາຍໃນ StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient ຕ້ອງໃຊ້ພາຍໃນ HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider ຕ້ອງໃຊ້ພາຍໃນ LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast ຕ້ອງໃຊ້ພາຍໃນ ToastProvider',
  'vue.error.unsupportedMethod': 'ວິທີການທີ່ບໍ່ຮອງຮັບ: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ຕ້ອງໃຊ້ພາຍໃນ ChatProvider',
  'vue.error.useEditorOutsideProvider': 'ຕ້ອງໃຊ້ useEditorProvider ພາຍໃນ EditorProvider',
  'vue.error.oauthFailed': 'ການເຂົ້າສູ່ລະບົບ OAuth ລົ້ມເຫຼວ',
  'vue.error.usePreviewOutsideProvider': 'ຕ້ອງໃຊ້ usePreviewProvider ພາຍໃນ PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider': 'ຕ້ອງໃຊ້ useWorkspaceProvider ພາຍໃນ WorkspaceProvider',
}
