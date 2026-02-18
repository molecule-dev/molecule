import type { SolidTranslations } from './types.js'

/** Solid translations for French. */
export const fr: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    "getStateProvider doit être utilisé dans un MoleculeProvider avec l'état configuré",
  'solid.error.authOutsideProvider':
    "getAuthClient doit être utilisé dans un MoleculeProvider avec l'authentification configurée",
  'solid.error.themeOutsideProvider':
    'getThemeProvider doit être utilisé dans un MoleculeProvider avec le thème configuré',
  'solid.error.routerOutsideProvider':
    'getRouter doit être utilisé dans un MoleculeProvider avec le routeur configuré',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider doit être utilisé dans un MoleculeProvider avec i18n configuré',
  'solid.error.httpOutsideProvider':
    'getHttpClient doit être utilisé dans un MoleculeProvider avec HTTP configuré',
  'solid.error.storageOutsideProvider':
    'getStorageProvider doit être utilisé dans un MoleculeProvider avec le stockage configuré',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider doit être utilisé dans un MoleculeProvider avec la journalisation configurée',
  'solid.error.useAccordionOutsideProvider':
    'Les composants Accordion doivent être utilisés dans un Accordion',
  'solid.error.useToastOutsideProvider': 'useToast doit être utilisé dans un ToastProvider',
}
