import type { SolidTranslations } from './types.js'

/** Solid translations for Norwegian Bokmål. */
export const nb: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider må brukes innenfor en MoleculeProvider med konfigurert tilstand',
  'solid.error.authOutsideProvider':
    'getAuthClient må brukes innenfor en MoleculeProvider med konfigurert autentisering',
  'solid.error.themeOutsideProvider':
    'getThemeProvider må brukes innenfor en MoleculeProvider med konfigurert tema',
  'solid.error.routerOutsideProvider':
    'getRouter må brukes innenfor en MoleculeProvider med konfigurert ruter',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider må brukes innenfor en MoleculeProvider med konfigurert i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient må brukes innenfor en MoleculeProvider med konfigurert HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider må brukes innenfor en MoleculeProvider med konfigurert lagring',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider må brukes innenfor en MoleculeProvider med konfigurert logging',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponenter må brukes innenfor en Accordion',
  'solid.error.useToastOutsideProvider': 'useToast må brukes innenfor en ToastProvider',
}
