import type { SolidTranslations } from './types.js'

/** Solid translations for Bulgarian. */
export const bg: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider трябва да се използва в MoleculeProvider с конфигурирано състояние',
  'solid.error.authOutsideProvider':
    'getAuthClient трябва да се използва в MoleculeProvider с конфигурирано удостоверяване',
  'solid.error.themeOutsideProvider':
    'getThemeProvider трябва да се използва в MoleculeProvider с конфигурирана тема',
  'solid.error.routerOutsideProvider':
    'getRouter трябва да се използва в MoleculeProvider с конфигуриран маршрутизатор',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider трябва да се използва в MoleculeProvider с конфигуриран i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient трябва да се използва в MoleculeProvider с конфигуриран HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider трябва да се използва в MoleculeProvider с конфигурирано хранилище',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider трябва да се използва в MoleculeProvider с конфигуриран логер',
  'solid.error.useAccordionOutsideProvider':
    'Компонентите на Accordion трябва да се използват в Accordion',
  'solid.error.useToastOutsideProvider': 'useToast трябва да се използва в ToastProvider',
}
