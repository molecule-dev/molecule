import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for ru. */
export const ru: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': 'фортепианный рулон',
  'pianoRoll.aria.keys': 'Клавиши пианино',
  'pianoRoll.aria.grid': 'Сетка заметок',
  'pianoRoll.aria.resize': 'Примечание по изменению размера',
  'pianoRoll.aria.note':
    'Примечание {{pitch}} начиная с ритма {{startBeat}} для {{durationBeats}} ритмы',
  'pianoRoll.aria.cursor': 'Курсор на {{pitch}} на ритме {{beat}}',
  'pianoRoll.aria.gridHelp':
    'Клавиши со стрелками перемещают курсор ячейки, Enter или пробел рисует на нём ноту.',
}
