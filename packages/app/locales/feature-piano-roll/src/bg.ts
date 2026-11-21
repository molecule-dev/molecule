import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for bg. */
export const bg: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': 'Пиано рол',
  'pianoRoll.aria.keys': 'Клавиши за пиано',
  'pianoRoll.aria.grid': 'Решетка за бележки',
  'pianoRoll.aria.resize': 'Преоразмеряване на бележката',
  'pianoRoll.aria.note':
    'Забележка {{pitch}} започвайки от такта {{startBeat}} за {{durationBeats}} бийтове',
  'pianoRoll.aria.cursor': 'Курсор върху {{pitch}} на такт {{beat}}',
  'pianoRoll.aria.gridHelp':
    'Стрелките местят курсора на клетката, Enter или Space рисува на него нота.',
}
