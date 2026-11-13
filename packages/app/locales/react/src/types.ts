/** Translation keys for the react locale package. */
export type ReactTranslationKey =
  | 'react.error.useAccordionOutsideProvider'
  | 'react.error.useAuthOutsideProvider'
  | 'react.error.useChatOutsideProvider'
  | 'react.error.useEditorOutsideProvider'
  | 'react.error.useHttpOutsideProvider'
  | 'react.error.useLoggerOutsideProvider'
  | 'react.error.usePreviewOutsideProvider'
  | 'react.error.useRouterOutsideProvider'
  | 'react.error.useStoreOutsideProvider'
  | 'react.error.useStorageOutsideProvider'
  | 'react.error.useThemeOutsideProvider'
  | 'react.error.useToastOutsideProvider'
  | 'react.error.useWorkspaceOutsideProvider'
  | 'react.error.unsupportedMethod'
  | 'react.error.oauthFailed'

/** Translation record mapping react keys to translated strings. */
export type ReactTranslations = Record<ReactTranslationKey, string>
