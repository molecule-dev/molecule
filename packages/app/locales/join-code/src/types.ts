/** Translation keys for the join-code locale package. */
export type JoinCodeTranslationKey =
  | 'joinCode.label'
  | 'joinCode.slotAriaLabel'
  | 'joinCode.help'
  | 'joinCode.errorAlphabet'

/** Translation record mapping join-code keys to translated strings. */
export type JoinCodeTranslations = Record<JoinCodeTranslationKey, string>
