/** Translation keys for the feature-piano-roll locale package. */
export type PianoRollTranslationKey =
  | 'pianoRoll.aria.roll'
  | 'pianoRoll.aria.keys'
  | 'pianoRoll.aria.grid'
  | 'pianoRoll.aria.gridHelp'
  | 'pianoRoll.aria.resize'
  | 'pianoRoll.aria.note'
  | 'pianoRoll.aria.cursor'

/** Translation record mapping piano-roll keys to translated strings. */
export type PianoRollTranslations = Record<PianoRollTranslationKey, string>
