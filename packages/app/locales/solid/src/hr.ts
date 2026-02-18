import type { SolidTranslations } from './types.js'

/** Solid translations for Croatian. */
export const hr: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider se mora koristiti unutar MoleculeProvider-a s konfiguriranim stanjem',
  'solid.error.authOutsideProvider':
    'getAuthClient se mora koristiti unutar MoleculeProvider-a s konfiguriranim autentifikacijom',
  'solid.error.themeOutsideProvider':
    'getThemeProvider se mora koristiti unutar MoleculeProvider-a s konfiguriranim temom',
  'solid.error.routerOutsideProvider':
    'getRouter se mora koristiti unutar MoleculeProvider-a s konfiguriranim usmjerivačem',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider se mora koristiti unutar MoleculeProvider-a s konfiguriranim i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient se mora koristiti unutar MoleculeProvider-a s konfiguriranim HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider se mora koristiti unutar MoleculeProvider-a s konfiguriranim pohranom',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider se mora koristiti unutar MoleculeProvider-a s konfiguriranim zapisnikom',
  'solid.error.useAccordionOutsideProvider':
    'Accordion komponente se moraju koristiti unutar Accordion-a',
  'solid.error.useToastOutsideProvider': 'useToast se mora koristiti unutar ToastProvider-a',
}
