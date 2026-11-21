import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for ko. */
export const ko: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': '피아노 롤',
  'pianoRoll.aria.keys': '피아노 건반',
  'pianoRoll.aria.grid': '노트 그리드',
  'pianoRoll.aria.resize': '크기 조정 메모',
  'pianoRoll.aria.note':
    '메모 {{pitch}} 박자에서 시작 {{startBeat}} ~을 위한 {{durationBeats}} 비트',
  'pianoRoll.aria.cursor': '{{pitch}} 박자 {{beat}}에 커서',
  'pianoRoll.aria.gridHelp':
    '화살표 키는 셀 커서를 움직이고, Enter 또는 스페이스바가 그 위치에 노트를 그립니다.',
}
