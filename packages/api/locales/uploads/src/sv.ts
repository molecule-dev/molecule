import type { UploadsTranslations } from './types.js'

/** Uploads translations for Swedish. */
export const sv: UploadsTranslations = {
  'uploads.error.noProvider':
    'Uppladdningsleverantör är inte konfigurerad. Anropa setProvider() först.',
  'uploads.error.streamLimitReached': 'Strömgränsen har nåtts.',
  'uploads.error.aborted': 'Uppladdningen avbröts.',
  'uploads.error.fileTypeBlocked': 'Filer av typen {{type}} kan inte laddas upp.',
  'uploads.error.activeTypeListed':
    'receiveUploads() anger {{type}}, en typ som en webbläsare kör. Skicka allowActiveTypes: true för att lagra den, och servera de filerna med sendUpload().',
}
