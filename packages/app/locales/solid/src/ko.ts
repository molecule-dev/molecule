import type { SolidTranslations } from './types.js'

/** Solid translations for Korean. */
export const ko: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider는 상태가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.authOutsideProvider':
    'getAuthClient는 인증이 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.themeOutsideProvider':
    'getThemeProvider는 테마가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.routerOutsideProvider':
    'getRouter는 라우터가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider는 i18n이 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.httpOutsideProvider':
    'getHttpClient는 HTTP가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.storageOutsideProvider':
    'getStorageProvider는 스토리지가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider는 로거가 구성된 MoleculeProvider 내에서 사용해야 합니다',
  'solid.error.useAccordionOutsideProvider':
    'Accordion 컴포넌트는 Accordion 내에서 사용해야 합니다',
  'solid.error.useToastOutsideProvider': 'useToast는 ToastProvider 내에서 사용해야 합니다',
}
