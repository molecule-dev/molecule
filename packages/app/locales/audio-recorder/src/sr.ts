import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for sr. */
export const sr: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Снимање звука није подржано у овом прегледачу',
  'audioRecorder.error': 'Снимање није успело. Молимо покушајте поново.',
  'audioRecorder.permissionDenied':
    'Дозвола за микрофон је одбијена. Дозволите приступ и покушајте поново.',
  'audioRecorder.pause': 'Пауза',
  'audioRecorder.resume': 'Резиме',
  'audioRecorder.stop': 'Заустави',
  'audioRecorder.elapsed': 'Протекло<x> {{време}}</x>',
  'audioRecorder.statusPaused': 'Паузирано',
  'audioRecorder.statusProcessed': 'Снимљено',
  'audioRecorder.statusError': 'Грешка',
  'audioRecorder.statusIdle': 'Спремно за снимање',
  'audioRecorder.group': 'Снимач звука',
}
