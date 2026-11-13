/** Translation keys for the status-bar locale package. */
export type StatusBarTranslationKey =
  'statusBar.error.noProvider' | 'statusBar.error.missingDependency'

/** Translation record mapping status-bar keys to translated strings. */
export type StatusBarTranslations = Record<StatusBarTranslationKey, string>
