import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for uk. */
export const uk: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Пауза',
  'audioRecorder.resume': 'Відновити',
  'audioRecorder.statusPaused': 'Призупинено',
  'audioRecorder.unsupported': 'Запис аудіо не підтримується в цьому браузері',
  'audioRecorder.error': 'Запис не вдалося. Спробуйте ще раз.',
  'audioRecorder.permissionDenied':
    'Доступ до мікрофона відхилено. Надайте доступ і спробуйте ще раз.',
  'audioRecorder.stop': 'СТІЙ',
  'audioRecorder.elapsed': 'Минуло<x> {{час}}</x>',
  'audioRecorder.statusProcessed': 'Записано',
  'audioRecorder.statusError': 'Помилка',
  'audioRecorder.statusIdle': 'Готовий до запису',
  'audioRecorder.group': 'Аудіодиктофон',
}
