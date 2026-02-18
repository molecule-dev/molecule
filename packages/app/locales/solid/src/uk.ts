import type { SolidTranslations } from './types.js'

/** Solid translations for Ukrainian. */
export const uk: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider повинен використовуватися всередині MoleculeProvider з налаштованим станом',
  'solid.error.authOutsideProvider':
    'getAuthClient повинен використовуватися всередині MoleculeProvider з налаштованим автентифікацією',
  'solid.error.themeOutsideProvider':
    'getThemeProvider повинен використовуватися всередині MoleculeProvider з налаштованим темою',
  'solid.error.routerOutsideProvider':
    'getRouter повинен використовуватися всередині MoleculeProvider з налаштованим маршрутизатором',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider повинен використовуватися всередині MoleculeProvider з налаштованим i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient повинен використовуватися всередині MoleculeProvider з налаштованим HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider повинен використовуватися всередині MoleculeProvider з налаштованим сховищем',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider повинен використовуватися всередині MoleculeProvider з налаштованим логером',
  'solid.error.useAccordionOutsideProvider':
    'Компоненти Accordion повинні використовуватися всередині Accordion',
  'solid.error.useToastOutsideProvider':
    'useToast повинен використовуватися всередині ToastProvider',
}
