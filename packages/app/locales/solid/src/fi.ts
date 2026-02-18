import type { SolidTranslations } from './types.js'

/** Solid translations for Finnish. */
export const fi: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty tila',
  'solid.error.authOutsideProvider':
    'getAuthClient on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty todennus',
  'solid.error.themeOutsideProvider':
    'getThemeProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty teema',
  'solid.error.routerOutsideProvider':
    'getRouter on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty reititin',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty tallennus',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty loki',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponentteja on käytettävä Accordion-komponentin sisällä',
  'solid.error.useToastOutsideProvider': 'useToast on käytettävä ToastProvider-komponentin sisällä',
}
