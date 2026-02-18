import type { SolidTranslations } from './types.js'

/** Solid translations for Vietnamese. */
export const vi: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider phải được sử dụng bên trong MoleculeProvider với trạng thái đã cấu hình',
  'solid.error.authOutsideProvider':
    'getAuthClient phải được sử dụng bên trong MoleculeProvider với xác thực đã cấu hình',
  'solid.error.themeOutsideProvider':
    'getThemeProvider phải được sử dụng bên trong MoleculeProvider với chủ đề đã cấu hình',
  'solid.error.routerOutsideProvider':
    'getRouter phải được sử dụng bên trong MoleculeProvider với bộ định tuyến đã cấu hình',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider phải được sử dụng bên trong MoleculeProvider với i18n đã cấu hình',
  'solid.error.httpOutsideProvider':
    'getHttpClient phải được sử dụng bên trong MoleculeProvider với HTTP đã cấu hình',
  'solid.error.storageOutsideProvider':
    'getStorageProvider phải được sử dụng bên trong MoleculeProvider với lưu trữ đã cấu hình',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider phải được sử dụng bên trong MoleculeProvider với ghi nhật ký đã cấu hình',
  'solid.error.useAccordionOutsideProvider':
    'Các thành phần Accordion phải được sử dụng bên trong Accordion',
  'solid.error.useToastOutsideProvider': 'useToast phải được sử dụng bên trong ToastProvider',
}
