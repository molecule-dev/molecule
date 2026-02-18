import type { SolidTranslations } from './types.js'

/** Solid translations for German. */
export const de: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Zustand verwendet werden',
  'solid.error.authOutsideProvider':
    'getAuthClient muss innerhalb eines MoleculeProvider mit konfiguriertem Authentifizierung verwendet werden',
  'solid.error.themeOutsideProvider':
    'getThemeProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Theme verwendet werden',
  'solid.error.routerOutsideProvider':
    'getRouter muss innerhalb eines MoleculeProvider mit konfiguriertem Router verwendet werden',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider muss innerhalb eines MoleculeProvider mit konfiguriertem i18n verwendet werden',
  'solid.error.httpOutsideProvider':
    'getHttpClient muss innerhalb eines MoleculeProvider mit konfiguriertem HTTP verwendet werden',
  'solid.error.storageOutsideProvider':
    'getStorageProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Speicher verwendet werden',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider muss innerhalb eines MoleculeProvider mit konfiguriertem Logger verwendet werden',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-Komponenten müssen innerhalb eines Accordion verwendet werden',
  'solid.error.useToastOutsideProvider':
    'useToast muss innerhalb eines ToastProvider verwendet werden',
}
