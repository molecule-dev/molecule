/** Translation keys for the react locale package. */
export type ReactTranslationKey =
  | 'react.error.useAccordionOutsideProvider'
  | 'react.error.useAuthOutsideProvider'
  | 'react.error.useChatOutsideProvider'
  | 'react.error.useEditorOutsideProvider'
  | 'react.error.useHttpOutsideProvider'
  | 'react.error.useI18nOutsideProvider'
  | 'react.error.useLoggerOutsideProvider'
  | 'react.error.usePreviewOutsideProvider'
  | 'react.error.useRouterOutsideProvider'
  | 'react.error.useStoreOutsideProvider'
  | 'react.error.useStorageOutsideProvider'
  | 'react.error.useThemeOutsideProvider'
  | 'react.error.useToastOutsideProvider'
  | 'react.error.useWorkspaceOutsideProvider'
  | 'react.error.unsupportedMethod'

/** Translation record mapping react keys to translated strings. */
export type ReactTranslations = Record<ReactTranslationKey, string>
