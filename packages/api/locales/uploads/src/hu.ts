import type { UploadsTranslations } from './types.js'

/** Uploads translations for Hungarian. */
export const hu: UploadsTranslations = {
  'uploads.error.noProvider':
    'A feltöltés szolgáltató nincs konfigurálva. Először hívja meg a setProvider()-t.',
  'uploads.error.streamLimitReached': 'Az adatfolyam korlátja elérve.',
  'uploads.error.aborted': 'A feltöltés megszakadt.',
  'uploads.error.fileTypeBlocked': '{{type}} típusú fájlok nem tölthetők fel.',
  'uploads.error.activeTypeListed':
    'A receiveUploads() felsorolja a(z) {{type}} típust, amelyet a böngésző futtat. Adja meg az allowActiveTypes: true beállítást a tároláshoz, és ezeket a fájlokat a sendUpload() függvénnyel szolgálja ki.',
}
