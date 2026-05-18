/** Translation keys for the piano-roll locale package. */
export type PianoRollTranslationKey =
  | 'pianoRoll.aria.roll'
  | 'pianoRoll.aria.keys'
  | 'pianoRoll.aria.grid'
  | 'pianoRoll.aria.resize'
  | 'pianoRoll.aria.note'

/** Translation record mapping piano-roll-react keys to translated strings. */
export type PianoRollTranslations = Record<PianoRollTranslationKey, string>
