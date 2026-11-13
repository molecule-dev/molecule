/** Translation keys for the vue locale package. */
export type VueTranslationKey =
  | 'vue.error.useRouterOutsideProvider'
  | 'vue.error.useStoreOutsideProvider'
  | 'vue.error.useThemeOutsideProvider'
  | 'vue.error.useAuthOutsideProvider'
  | 'vue.error.useStorageOutsideProvider'
  | 'vue.error.useHttpOutsideProvider'
  | 'vue.error.useLoggerOutsideProvider'
  | 'vue.error.useToastOutsideProvider'
  | 'vue.error.unsupportedMethod'
  | 'vue.error.useChatOutsideProvider'
  | 'vue.error.useEditorOutsideProvider'
  | 'vue.error.oauthFailed'
  | 'vue.error.usePreviewOutsideProvider'
  | 'vue.error.useWorkspaceOutsideProvider'

/** Translation record mapping vue keys to translated strings. */
export type VueTranslations = Record<VueTranslationKey, string>
