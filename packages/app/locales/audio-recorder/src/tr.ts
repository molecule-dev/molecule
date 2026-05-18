import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for tr. */
export const tr: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Duraklat',
  'audioRecorder.resume': 'Devam et',
  'audioRecorder.statusPaused': 'Duraklatıldı',
  'audioRecorder.unsupported': 'Bu tarayıcıda ses kaydı desteklenmiyor.',
  'audioRecorder.error': 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.',
  'audioRecorder.permissionDenied':
    'Mikrofon izni reddedildi. Erişime izin verin ve tekrar deneyin.',
  'audioRecorder.stop': 'Durmak',
  'audioRecorder.elapsed': 'Geçen süre<x> {{zaman}}</x>',
  'audioRecorder.statusProcessed': 'Kaydedildi',
  'audioRecorder.statusError': 'Hata',
  'audioRecorder.statusIdle': 'Kayda hazır',
  'audioRecorder.group': 'Ses kaydedici',
}
