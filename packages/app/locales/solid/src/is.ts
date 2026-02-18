import type { SolidTranslations } from './types.js'

/** Solid translations for Icelandic. */
export const is: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider verður að nota innan MoleculeProvider með stilltri stöðu',
  'solid.error.authOutsideProvider':
    'getAuthClient verður að nota innan MoleculeProvider með stilltri auðkenningu',
  'solid.error.themeOutsideProvider':
    'getThemeProvider verður að nota innan MoleculeProvider með stilltri þema',
  'solid.error.routerOutsideProvider':
    'getRouter verður að nota innan MoleculeProvider með stilltri beini',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider verður að nota innan MoleculeProvider með stilltri i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient verður að nota innan MoleculeProvider með stilltri HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider verður að nota innan MoleculeProvider með stilltri geymslu',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider verður að nota innan MoleculeProvider með stilltri skráningu',
  'solid.error.useAccordionOutsideProvider':
    'Accordion hlutir verða að vera notaðir innan Accordion',
  'solid.error.useToastOutsideProvider': 'useToast verður að nota innan ToastProvider',
}
