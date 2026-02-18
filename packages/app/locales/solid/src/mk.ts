import type { SolidTranslations } from './types.js'

/** Solid translations for Macedonian. */
export const mk: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider мора да се користи во MoleculeProvider со конфигурирано состојба',
  'solid.error.authOutsideProvider':
    'getAuthClient мора да се користи во MoleculeProvider со конфигурирано автентикација',
  'solid.error.themeOutsideProvider':
    'getThemeProvider мора да се користи во MoleculeProvider со конфигурирано тема',
  'solid.error.routerOutsideProvider':
    'getRouter мора да се користи во MoleculeProvider со конфигурирано рутер',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider мора да се користи во MoleculeProvider со конфигурирано i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient мора да се користи во MoleculeProvider со конфигурирано HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider мора да се користи во MoleculeProvider со конфигурирано складирање',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider мора да се користи во MoleculeProvider со конфигурирано записи',
  'solid.error.useAccordionOutsideProvider':
    'Компонентите на Accordion мора да се користат во Accordion',
  'solid.error.useToastOutsideProvider': 'useToast мора да се користи во ToastProvider',
}
