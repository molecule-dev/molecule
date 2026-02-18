import type { SolidTranslations } from './types.js'

/** Solid translations for Portuguese. */
export const pt: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider deve ser usado dentro de um MoleculeProvider com estado configurado',
  'solid.error.authOutsideProvider':
    'getAuthClient deve ser usado dentro de um MoleculeProvider com autenticação configurada',
  'solid.error.themeOutsideProvider':
    'getThemeProvider deve ser usado dentro de um MoleculeProvider com tema configurado',
  'solid.error.routerOutsideProvider':
    'getRouter deve ser usado dentro de um MoleculeProvider com roteador configurado',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider deve ser usado dentro de um MoleculeProvider com i18n configurado',
  'solid.error.httpOutsideProvider':
    'getHttpClient deve ser usado dentro de um MoleculeProvider com HTTP configurado',
  'solid.error.storageOutsideProvider':
    'getStorageProvider deve ser usado dentro de um MoleculeProvider com armazenamento configurado',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider deve ser usado dentro de um MoleculeProvider com log configurado',
  'solid.error.useAccordionOutsideProvider':
    'Os componentes Accordion devem ser usados dentro de um Accordion',
  'solid.error.useToastOutsideProvider': 'useToast deve ser usado dentro de um ToastProvider',
}
