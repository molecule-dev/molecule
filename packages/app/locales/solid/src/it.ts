import type { SolidTranslations } from './types.js'

/** Solid translations for Italian. */
export const it: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    "getStateProvider deve essere utilizzato all'interno di un MoleculeProvider con stato configurato",
  'solid.error.authOutsideProvider':
    "getAuthClient deve essere utilizzato all'interno di un MoleculeProvider con autenticazione configurata",
  'solid.error.themeOutsideProvider':
    "getThemeProvider deve essere utilizzato all'interno di un MoleculeProvider con tema configurato",
  'solid.error.routerOutsideProvider':
    "getRouter deve essere utilizzato all'interno di un MoleculeProvider con router configurato",
  'solid.error.i18nOutsideProvider':
    "getI18nProvider deve essere utilizzato all'interno di un MoleculeProvider con i18n configurato",
  'solid.error.httpOutsideProvider':
    "getHttpClient deve essere utilizzato all'interno di un MoleculeProvider con HTTP configurato",
  'solid.error.storageOutsideProvider':
    "getStorageProvider deve essere utilizzato all'interno di un MoleculeProvider con archiviazione configurata",
  'solid.error.loggerOutsideProvider':
    "getLoggerProvider deve essere utilizzato all'interno di un MoleculeProvider con logging configurato",
  'solid.error.useAccordionOutsideProvider':
    "I componenti Accordion devono essere utilizzati all'interno di un Accordion",
  'solid.error.useToastOutsideProvider':
    "useToast deve essere utilizzato all'interno di un ToastProvider",
}
