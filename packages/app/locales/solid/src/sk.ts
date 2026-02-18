import type { SolidTranslations } from './types.js'

/** Solid translations for Slovak. */
export const sk: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider musí byť použitý vnútri MoleculeProvider s nakonfigurovaným stavom',
  'solid.error.authOutsideProvider':
    'getAuthClient musí byť použitý vnútri MoleculeProvider s nakonfigurovaným autentifikáciou',
  'solid.error.themeOutsideProvider':
    'getThemeProvider musí byť použitý vnútri MoleculeProvider s nakonfigurovaným témou',
  'solid.error.routerOutsideProvider':
    'getRouter musí byť použitý vnútri MoleculeProvider s nakonfigurovaným smerovačom',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider musí byť použitý vnútri MoleculeProvider s nakonfigurovaným i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient musí byť použitý vnútri MoleculeProvider s nakonfigurovaným HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider musí byť použitý vnútri MoleculeProvider s nakonfigurovaným úložiskom',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider musí byť použitý vnútri MoleculeProvider s nakonfigurovaným logovaním',
  'solid.error.useAccordionOutsideProvider':
    'Komponenty Accordion musia byť použité vnútri Accordion',
  'solid.error.useToastOutsideProvider': 'useToast musí byť použitý vnútri ToastProvider',
}
