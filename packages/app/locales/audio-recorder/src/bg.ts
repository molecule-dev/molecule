import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for bg. */
export const bg: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Аудиозаписът не се поддържа в този браузър',
  'audioRecorder.error': 'Записът не бе успешен. Моля, опитайте отново.',
  'audioRecorder.permissionDenied':
    'Разрешението за микрофон е отказано. Разрешете достъпа и опитайте отново.',
  'audioRecorder.pause': 'Пауза',
  'audioRecorder.resume': 'Автобиография',
  'audioRecorder.stop': 'Спри',
  'audioRecorder.elapsed': 'Изминало<x> {{време}}</x>',
  'audioRecorder.statusPaused': 'Пауза',
  'audioRecorder.statusProcessed': 'Записано',
  'audioRecorder.statusError': 'Грешка',
  'audioRecorder.statusIdle': 'Готов за запис',
  'audioRecorder.group': 'Аудио рекордер',
}
