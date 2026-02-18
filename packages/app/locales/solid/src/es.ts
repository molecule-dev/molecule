import type { SolidTranslations } from './types.js'

/** Solid translations for Spanish. */
export const es: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider debe usarse dentro de un MoleculeProvider con estado configurado',
  'solid.error.authOutsideProvider':
    'getAuthClient debe usarse dentro de un MoleculeProvider con autenticación configurada',
  'solid.error.themeOutsideProvider':
    'getThemeProvider debe usarse dentro de un MoleculeProvider con tema configurado',
  'solid.error.routerOutsideProvider':
    'getRouter debe usarse dentro de un MoleculeProvider con enrutador configurado',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider debe usarse dentro de un MoleculeProvider con i18n configurado',
  'solid.error.httpOutsideProvider':
    'getHttpClient debe usarse dentro de un MoleculeProvider con HTTP configurado',
  'solid.error.storageOutsideProvider':
    'getStorageProvider debe usarse dentro de un MoleculeProvider con almacenamiento configurado',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider debe usarse dentro de un MoleculeProvider con registro configurado',
  'solid.error.useAccordionOutsideProvider':
    'Los componentes de Accordion deben usarse dentro de un Accordion',
  'solid.error.useToastOutsideProvider': 'useToast debe usarse dentro de un ToastProvider',
}
