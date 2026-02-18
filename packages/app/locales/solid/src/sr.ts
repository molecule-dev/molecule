import type { SolidTranslations } from './types.js'

/** Solid translations for Serbian. */
export const sr: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider мора се користити унутар MoleculeProvider-а са конфигурисаним стањем',
  'solid.error.authOutsideProvider':
    'getAuthClient мора се користити унутар MoleculeProvider-а са конфигурисаним аутентикацијом',
  'solid.error.themeOutsideProvider':
    'getThemeProvider мора се користити унутар MoleculeProvider-а са конфигурисаним темом',
  'solid.error.routerOutsideProvider':
    'getRouter мора се користити унутар MoleculeProvider-а са конфигурисаним рутером',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider мора се користити унутар MoleculeProvider-а са конфигурисаним i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient мора се користити унутар MoleculeProvider-а са конфигурисаним HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider мора се користити унутар MoleculeProvider-а са конфигурисаним складиштем',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider мора се користити унутар MoleculeProvider-а са конфигурисаним логером',
  'solid.error.useAccordionOutsideProvider':
    'Accordion компоненте морају се користити унутар Accordion-а',
  'solid.error.useToastOutsideProvider': 'useToast мора се користити унутар ToastProvider-а',
}
