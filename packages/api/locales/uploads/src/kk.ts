import type { UploadsTranslations } from './types.js'

/** Uploads translations for Kazakh. */
export const kk: UploadsTranslations = {
  'uploads.error.noProvider':
    'Жүктеу провайдері конфигурацияланбаған. Алдымен setProvider() шақырыңыз.',
  'uploads.error.streamLimitReached': 'Ағын шегіне жетті.',
  'uploads.error.aborted': 'Жүктеу тоқтатылды.',
  'uploads.error.fileTypeBlocked': '{{type}} түріндегі файлдарды жүктеу мүмкін емес.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} түрін көрсетеді, бұл браузер іске қосатын түр. Оны сақтау үшін allowActiveTypes: true беріңіз, ал ол файлдарды sendUpload() арқылы беріңіз.',
}
