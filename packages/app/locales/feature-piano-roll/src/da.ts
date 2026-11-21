import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for da. */
export const da: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': 'Klaverrulle',
  'pianoRoll.aria.keys': 'Klavernøgler',
  'pianoRoll.aria.grid': 'Notegitter',
  'pianoRoll.aria.resize': 'Ændr størrelse på noten',
  'pianoRoll.aria.note':
    'Note {{pitch}} starter ved taktslag {{startBeat}} for {{durationBeats}} taktslag',
  'pianoRoll.aria.cursor': 'Markør på {{pitch}} ved taktslag {{beat}}',
  'pianoRoll.aria.gridHelp':
    'Piletasterne flytter celle-markøren, Enter eller mellemrumstasten tegner en node der.',
}
