import type { SolidTranslations } from './types.js'

/** Solid translations for Hungarian. */
export const hu: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider -t egy MoleculeProvider-en belül kell használni konfigurált állapottal',
  'solid.error.authOutsideProvider':
    'getAuthClient -t egy MoleculeProvider-en belül kell használni konfigurált hitelesítéssel',
  'solid.error.themeOutsideProvider':
    'getThemeProvider -t egy MoleculeProvider-en belül kell használni konfigurált témával',
  'solid.error.routerOutsideProvider':
    'getRouter -t egy MoleculeProvider-en belül kell használni konfigurált útválasztóval',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider -t egy MoleculeProvider-en belül kell használni konfigurált i18n-nel',
  'solid.error.httpOutsideProvider':
    'getHttpClient -t egy MoleculeProvider-en belül kell használni konfigurált HTTP-vel',
  'solid.error.storageOutsideProvider':
    'getStorageProvider -t egy MoleculeProvider-en belül kell használni konfigurált tárolóval',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider -t egy MoleculeProvider-en belül kell használni konfigurált naplózóval',
  'solid.error.useAccordionOutsideProvider':
    'Az Accordion komponenseket egy Accordion-on belül kell használni',
  'solid.error.useToastOutsideProvider': 'useToast -t egy ToastProvider-en belül kell használni',
}
