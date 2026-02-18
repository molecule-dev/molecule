import type { SolidTranslations } from './types.js'

/** Solid translations for Bosnian. */
export const bs: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider se mora koristiti unutar MoleculeProvider-a sa konfigurisanim stanjem',
  'solid.error.authOutsideProvider':
    'getAuthClient se mora koristiti unutar MoleculeProvider-a sa konfigurisanim autentifikacijom',
  'solid.error.themeOutsideProvider':
    'getThemeProvider se mora koristiti unutar MoleculeProvider-a sa konfigurisanim temom',
  'solid.error.routerOutsideProvider':
    'getRouter se mora koristiti unutar MoleculeProvider-a sa konfigurisanim ruterom',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider se mora koristiti unutar MoleculeProvider-a sa konfigurisanim i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient se mora koristiti unutar MoleculeProvider-a sa konfigurisanim HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider se mora koristiti unutar MoleculeProvider-a sa konfigurisanim skladištenjem',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider se mora koristiti unutar MoleculeProvider-a sa konfigurisanim logerom',
  'solid.error.useAccordionOutsideProvider':
    'Accordion komponente se moraju koristiti unutar Accordion-a',
  'solid.error.useToastOutsideProvider': 'useToast se mora koristiti unutar ToastProvider-a',
}
