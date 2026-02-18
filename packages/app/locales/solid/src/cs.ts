import type { SolidTranslations } from './types.js'

/** Solid translations for Czech. */
export const cs: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným stavem',
  'solid.error.authOutsideProvider':
    'getAuthClient musí být použit uvnitř MoleculeProvider s nakonfigurovaným autentizací',
  'solid.error.themeOutsideProvider':
    'getThemeProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným motivem',
  'solid.error.routerOutsideProvider':
    'getRouter musí být použit uvnitř MoleculeProvider s nakonfigurovaným routerem',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient musí být použit uvnitř MoleculeProvider s nakonfigurovaným HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným úložištěm',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider musí být použit uvnitř MoleculeProvider s nakonfigurovaným loggerem',
  'solid.error.useAccordionOutsideProvider':
    'Komponenty Accordion musí být použity uvnitř Accordion',
  'solid.error.useToastOutsideProvider': 'useToast musí být použit uvnitř ToastProvider',
}
