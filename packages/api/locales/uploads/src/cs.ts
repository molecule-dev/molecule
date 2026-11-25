import type { UploadsTranslations } from './types.js'

/** Uploads translations for Czech. */
export const cs: UploadsTranslations = {
  'uploads.error.noProvider':
    'Poskytovatel nahrávání není nakonfigurován. Nejprve zavolejte setProvider().',
  'uploads.error.streamLimitReached': 'Byl dosažen limit streamu.',
  'uploads.error.aborted': 'Nahrávání bylo přerušeno.',
  'uploads.error.fileTypeBlocked': 'Soubory typu {{type}} nelze nahrát.',
  'uploads.error.activeTypeListed':
    'receiveUploads() uvádí {{type}}, typ, který prohlížeč spouští. Předejte allowActiveTypes: true, aby se uložil, a takové soubory posílejte pomocí sendUpload().',
}
