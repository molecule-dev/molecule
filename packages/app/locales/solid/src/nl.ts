import type { SolidTranslations } from './types.js'

/** Solid translations for Dutch. */
export const nl: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider moet worden gebruikt binnen een MoleculeProvider met geconfigureerde state',
  'solid.error.authOutsideProvider':
    'getAuthClient moet worden gebruikt binnen een MoleculeProvider met geconfigureerde auth',
  'solid.error.themeOutsideProvider':
    'getThemeProvider moet worden gebruikt binnen een MoleculeProvider met geconfigureerde thema',
  'solid.error.routerOutsideProvider':
    'getRouter moet worden gebruikt binnen een MoleculeProvider met geconfigureerde router',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider moet worden gebruikt binnen een MoleculeProvider met geconfigureerde i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient moet worden gebruikt binnen een MoleculeProvider met geconfigureerde HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider moet worden gebruikt binnen een MoleculeProvider met geconfigureerde opslag',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider moet worden gebruikt binnen een MoleculeProvider met geconfigureerde logger',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-componenten moeten worden gebruikt binnen een Accordion',
  'solid.error.useToastOutsideProvider': 'useToast moet worden gebruikt binnen een ToastProvider',
}
