/** Translation keys for the solid locale package. */
export type SolidTranslationKey =
  | 'solid.error.stateOutsideProvider'
  | 'solid.error.authOutsideProvider'
  | 'solid.error.themeOutsideProvider'
  | 'solid.error.routerOutsideProvider'
  | 'solid.error.i18nOutsideProvider'
  | 'solid.error.httpOutsideProvider'
  | 'solid.error.storageOutsideProvider'
  | 'solid.error.loggerOutsideProvider'
  | 'solid.error.useAccordionOutsideProvider'
  | 'solid.error.useToastOutsideProvider'

/** Translation record mapping solid keys to translated strings. */
export type SolidTranslations = Record<SolidTranslationKey, string>
