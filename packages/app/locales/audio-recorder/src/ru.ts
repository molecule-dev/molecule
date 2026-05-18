import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ru. */
export const ru: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Запись звука в этом браузере не поддерживается.',
  'audioRecorder.error': 'Запись не удалась. Пожалуйста, попробуйте еще раз.',
  'audioRecorder.permissionDenied':
    'Доступ к микрофону запрещен. Предоставьте доступ и попробуйте снова.',
  'audioRecorder.pause': 'Пауза',
  'audioRecorder.resume': 'Резюме',
  'audioRecorder.stop': 'Останавливаться',
  'audioRecorder.elapsed': 'Прошло<x> {{время}}</x>',
  'audioRecorder.statusPaused': 'Приостановлено',
  'audioRecorder.statusProcessed': 'Записано',
  'audioRecorder.statusError': 'Ошибка',
  'audioRecorder.statusIdle': 'Готов к записи',
  'audioRecorder.group': 'Аудиозапись',
}
