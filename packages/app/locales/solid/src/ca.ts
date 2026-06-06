import type { SolidTranslations } from './types.js'

/** Solid translations for ca. */
export const ca: Partial<SolidTranslations> = {
  'solid.error.stateOutsideProvider':
    "getStateProvider s'ha d'utilitzar dins d'un MoleculeProvider amb l'estat configurat.",
  'solid.error.authOutsideProvider':
    "getAuthClient s'ha d'utilitzar dins d'un MoleculeProvider amb l'autenticació configurada.",
  'solid.error.themeOutsideProvider':
    "getThemeProvider s'ha d'utilitzar dins d'un MoleculeProvider amb el tema configurat.",
  'solid.error.routerOutsideProvider':
    "getRouter s'ha d'utilitzar dins d'un MoleculeProvider amb l'encaminador configurat.",
  'solid.error.i18nOutsideProvider':
    "getI18nProvider s'ha d'utilitzar dins d'un MoleculeProvider amb i18n configurat.",
  'solid.error.httpOutsideProvider':
    "getHttpClient s'ha d'utilitzar dins d'un MoleculeProvider amb http configurat.",
  'solid.error.storageOutsideProvider':
    "getStorageProvider s'ha d'utilitzar dins d'un MoleculeProvider amb l'emmagatzematge configurat.",
  'solid.error.loggerOutsideProvider':
    "getLoggerProvider s'ha d'utilitzar dins d'un MoleculeProvider amb el logger configurat.",
  'solid.error.useAccordionOutsideProvider':
    "Els components de l'acordió s'han d'utilitzar dins d'un acordió.",
  'solid.error.useToastOutsideProvider': "useToast s'ha d'utilitzar dins d'un ToastProvider.",
}
