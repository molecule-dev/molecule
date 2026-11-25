import type { UploadsTranslations } from './types.js'

/** Uploads translations for Turkish. */
export const tr: UploadsTranslations = {
  'uploads.error.noProvider':
    'Yükleme sağlayıcısı yapılandırılmamış. Önce setProvider() çağrısı yapın.',
  'uploads.error.streamLimitReached': 'Akış sınırına ulaşıldı.',
  'uploads.error.aborted': 'Yükleme iptal edildi.',
  'uploads.error.fileTypeBlocked': '{{type}} türündeki dosyalar yüklenemez.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} türünü listeliyor; bu, tarayıcının çalıştırdığı bir türdür. Saklamak için allowActiveTypes: true verin ve bu dosyaları sendUpload() ile sunun.',
}
