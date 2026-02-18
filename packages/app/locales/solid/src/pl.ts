import type { SolidTranslations } from './types.js'

/** Solid translations for Polish. */
export const pl: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym stanem',
  'solid.error.authOutsideProvider':
    'getAuthClient musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym uwierzytelnianiem',
  'solid.error.themeOutsideProvider':
    'getThemeProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym motywem',
  'solid.error.routerOutsideProvider':
    'getRouter musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym routerem',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym przechowywaniem',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider musi być użyty wewnątrz MoleculeProvider ze skonfigurowanym loggerem',
  'solid.error.useAccordionOutsideProvider':
    'Komponenty Accordion muszą być użyte wewnątrz Accordion',
  'solid.error.useToastOutsideProvider': 'useToast musi być użyty wewnątrz ToastProvider',
}
