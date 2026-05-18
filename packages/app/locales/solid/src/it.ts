import type { SolidTranslations } from './types.js'

/** Solid translations for it. */
export const it: Partial<SolidTranslations> = {
  'solid.error.stateOutsideProvider':
    'getStateProvider deve essere utilizzato all&#39;interno di un MoleculeProvider con stato configurato',
  'solid.error.authOutsideProvider':
    'getAuthClient deve essere utilizzato all&#39;interno di un MoleculeProvider con autenticazione configurata',
  'solid.error.themeOutsideProvider':
    'getThemeProvider deve essere utilizzato all&#39;interno di un MoleculeProvider con il tema configurato',
  'solid.error.routerOutsideProvider':
    'getRouter deve essere utilizzato all&#39;interno di un MoleculeProvider con router configurato',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider deve essere utilizzato all&#39;interno di un MoleculeProvider con i18n configurato',
  'solid.error.httpOutsideProvider':
    'getHttpClient deve essere utilizzato all&#39;interno di un MoleculeProvider con http configurato',
  'solid.error.storageOutsideProvider':
    'getStorageProvider deve essere utilizzato all&#39;interno di un MoleculeProvider con storage configurato',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider deve essere utilizzato all&#39;interno di un MoleculeProvider con logger configurato',
  'solid.error.useAccordionOutsideProvider':
    'I componenti della fisarmonica devono essere utilizzati all&#39;interno di una fisarmonica',
  'solid.error.useToastOutsideProvider':
    'useToast deve essere utilizzato all&#39;interno di un ToastProvider',
}
