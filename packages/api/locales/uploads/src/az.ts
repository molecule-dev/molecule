import type { UploadsTranslations } from './types.js'

/** Uploads translations for Azerbaijani. */
export const az: UploadsTranslations = {
  'uploads.error.noProvider':
    'Yükləmə provayderi konfiqurasiya edilməyib. Əvvəlcə setProvider() çağırın.',
  'uploads.error.streamLimitReached': 'Axın limitinə çatıldı.',
  'uploads.error.aborted': 'Yükləmə ləğv edildi.',
  'uploads.error.fileTypeBlocked': '{{type}} tipli fayllar yüklənə bilməz.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} növünü sadalayır, bu brauzerin icra etdiyi növdür. Onu saxlamaq üçün allowActiveTypes: true ötürün və həmin faylları sendUpload() ilə təqdim edin.',
}
