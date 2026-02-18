import type { SolidTranslations } from './types.js'

/** Solid translations for Danish. */
export const da: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider skal bruges inden for en MoleculeProvider med tilstand konfigureret',
  'solid.error.authOutsideProvider':
    'getAuthClient skal bruges inden for en MoleculeProvider med godkendelse konfigureret',
  'solid.error.themeOutsideProvider':
    'getThemeProvider skal bruges inden for en MoleculeProvider med tema konfigureret',
  'solid.error.routerOutsideProvider':
    'getRouter skal bruges inden for en MoleculeProvider med router konfigureret',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider skal bruges inden for en MoleculeProvider med i18n konfigureret',
  'solid.error.httpOutsideProvider':
    'getHttpClient skal bruges inden for en MoleculeProvider med HTTP konfigureret',
  'solid.error.storageOutsideProvider':
    'getStorageProvider skal bruges inden for en MoleculeProvider med lager konfigureret',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider skal bruges inden for en MoleculeProvider med log konfigureret',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponenter skal bruges inden for en Accordion',
  'solid.error.useToastOutsideProvider': 'useToast skal bruges inden for en ToastProvider',
}
