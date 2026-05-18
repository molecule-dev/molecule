import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for mk. */
export const mk: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Снимањето аудио не е поддржано во овој прелистувач',
  'audioRecorder.error': 'Снимањето не успеа. Обидете се повторно.',
  'audioRecorder.permissionDenied':
    'Дозволата за микрофон е одбиена. Дозволете пристап и обидете се повторно.',
  'audioRecorder.pause': 'Пауза',
  'audioRecorder.resume': 'Резиме',
  'audioRecorder.stop': 'Стоп',
  'audioRecorder.elapsed': 'Поминато<x> {{време}}</x>',
  'audioRecorder.statusPaused': 'Паузирано',
  'audioRecorder.statusProcessed': 'Снимено',
  'audioRecorder.statusError': 'Грешка',
  'audioRecorder.statusIdle': 'Подготвено за снимање',
  'audioRecorder.group': 'Аудио рекордер',
}
