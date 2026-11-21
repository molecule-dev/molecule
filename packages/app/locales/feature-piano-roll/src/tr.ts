import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for tr. */
export const tr: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': 'Piyano rulosu',
  'pianoRoll.aria.keys': 'Piyano tuşları',
  'pianoRoll.aria.grid': 'Not tablosu',
  'pianoRoll.aria.resize': 'Yeniden boyutlandırma notu',
  'pianoRoll.aria.note':
    'Not {{pitch}} vuruştan başlayarak {{startBeat}} için {{durationBeats}} vuruşlar',
  'pianoRoll.aria.cursor': 'İmleç {{pitch}} üzerinde, {{beat}} vuruşunda',
  'pianoRoll.aria.gridHelp':
    'Ok tuşları hücre imlecini taşır, Enter veya Boşluk tuşu oraya bir nota çizer.',
}
