import type { SolidTranslations } from './types.js'

/** Solid translations for Galician. */
export const gl: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider debe usarse dentro dun MoleculeProvider con estado configurado',
  'solid.error.authOutsideProvider':
    'getAuthClient debe usarse dentro dun MoleculeProvider con autenticación configurada',
  'solid.error.themeOutsideProvider':
    'getThemeProvider debe usarse dentro dun MoleculeProvider con tema configurado',
  'solid.error.routerOutsideProvider':
    'getRouter debe usarse dentro dun MoleculeProvider con enrutador configurado',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider debe usarse dentro dun MoleculeProvider con i18n configurado',
  'solid.error.httpOutsideProvider':
    'getHttpClient debe usarse dentro dun MoleculeProvider con HTTP configurado',
  'solid.error.storageOutsideProvider':
    'getStorageProvider debe usarse dentro dun MoleculeProvider con almacenamento configurado',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider debe usarse dentro dun MoleculeProvider con rexistro configurado',
  'solid.error.useAccordionOutsideProvider':
    'Os compoñentes de Accordion deben usarse dentro dun Accordion',
  'solid.error.useToastOutsideProvider': 'useToast debe usarse dentro dun ToastProvider',
}
