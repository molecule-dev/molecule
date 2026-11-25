import type { UploadsTranslations } from './types.js'

/** Uploads translations for Latvian. */
export const lv: UploadsTranslations = {
  'uploads.error.noProvider':
    'Augšupielādes nodrošinātājs nav konfigurēts. Vispirms izsauciet setProvider().',
  'uploads.error.streamLimitReached': 'Sasniegts straumes limits.',
  'uploads.error.aborted': 'Augšupielāde tika pārtraukta.',
  'uploads.error.fileTypeBlocked': '{{type}} tipa failus nevar augšupielādēt.',
  'uploads.error.activeTypeListed':
    'receiveUploads() norāda {{type}} — tipu, ko pārlūks izpilda. Nododiet allowActiveTypes: true, lai to saglabātu, un pasniedziet šos failus ar sendUpload().',
}
