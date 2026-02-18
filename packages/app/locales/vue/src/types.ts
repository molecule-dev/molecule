/** Translation keys for the vue locale package. */
export type VueTranslationKey =
  | 'vue.error.useRouterOutsideProvider'
  | 'vue.error.useI18nOutsideProvider'
  | 'vue.error.useStoreOutsideProvider'
  | 'vue.error.useThemeOutsideProvider'
  | 'vue.error.useAuthOutsideProvider'
  | 'vue.error.useStorageOutsideProvider'
  | 'vue.error.useHttpOutsideProvider'
  | 'vue.error.useLoggerOutsideProvider'
  | 'vue.error.useToastOutsideProvider'
  | 'vue.error.unsupportedMethod'

/** Translation record mapping vue keys to translated strings. */
export type VueTranslations = Record<VueTranslationKey, string>
