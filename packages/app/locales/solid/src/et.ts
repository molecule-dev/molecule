import type { SolidTranslations } from './types.js'

/** Solid translations for Estonian. */
export const et: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider tuleb kasutada MoleculeProvider sees koos konfigureeritud olekuga',
  'solid.error.authOutsideProvider':
    'getAuthClient tuleb kasutada MoleculeProvider sees koos konfigureeritud autentimisega',
  'solid.error.themeOutsideProvider':
    'getThemeProvider tuleb kasutada MoleculeProvider sees koos konfigureeritud teemaga',
  'solid.error.routerOutsideProvider':
    'getRouter tuleb kasutada MoleculeProvider sees koos konfigureeritud ruuteriga',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider tuleb kasutada MoleculeProvider sees koos konfigureeritud i18n-iga',
  'solid.error.httpOutsideProvider':
    'getHttpClient tuleb kasutada MoleculeProvider sees koos konfigureeritud HTTP-ga',
  'solid.error.storageOutsideProvider':
    'getStorageProvider tuleb kasutada MoleculeProvider sees koos konfigureeritud salvestusega',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider tuleb kasutada MoleculeProvider sees koos konfigureeritud logijaga',
  'solid.error.useAccordionOutsideProvider': 'Accordion komponente tuleb kasutada Accordion sees',
  'solid.error.useToastOutsideProvider': 'useToast tuleb kasutada ToastProvider sees',
}
