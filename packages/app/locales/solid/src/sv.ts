import type { SolidTranslations } from './types.js'

/** Solid translations for Swedish. */
export const sv: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider måste användas inom en MoleculeProvider med konfigurerad tillstånd',
  'solid.error.authOutsideProvider':
    'getAuthClient måste användas inom en MoleculeProvider med konfigurerad autentisering',
  'solid.error.themeOutsideProvider':
    'getThemeProvider måste användas inom en MoleculeProvider med konfigurerad tema',
  'solid.error.routerOutsideProvider':
    'getRouter måste användas inom en MoleculeProvider med konfigurerad router',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider måste användas inom en MoleculeProvider med konfigurerad i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient måste användas inom en MoleculeProvider med konfigurerad HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider måste användas inom en MoleculeProvider med konfigurerad lagring',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider måste användas inom en MoleculeProvider med konfigurerad loggning',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponenter måste användas inom en Accordion',
  'solid.error.useToastOutsideProvider': 'useToast måste användas inom en ToastProvider',
}
