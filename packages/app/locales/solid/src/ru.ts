import type { SolidTranslations } from './types.js'

/** Solid translations for Russian. */
export const ru: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider должен использоваться внутри MoleculeProvider с настроенным состоянием',
  'solid.error.authOutsideProvider':
    'getAuthClient должен использоваться внутри MoleculeProvider с настроенным аутентификацией',
  'solid.error.themeOutsideProvider':
    'getThemeProvider должен использоваться внутри MoleculeProvider с настроенным темой',
  'solid.error.routerOutsideProvider':
    'getRouter должен использоваться внутри MoleculeProvider с настроенным роутером',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider должен использоваться внутри MoleculeProvider с настроенным i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient должен использоваться внутри MoleculeProvider с настроенным HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider должен использоваться внутри MoleculeProvider с настроенным хранилищем',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider должен использоваться внутри MoleculeProvider с настроенным логгером',
  'solid.error.useAccordionOutsideProvider':
    'Компоненты Accordion должны использоваться внутри Accordion',
  'solid.error.useToastOutsideProvider': 'useToast должен использоваться внутри ToastProvider',
}
