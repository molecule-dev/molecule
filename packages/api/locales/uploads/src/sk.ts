import type { UploadsTranslations } from './types.js'

/** Uploads translations for Slovak. */
export const sk: UploadsTranslations = {
  'uploads.error.noProvider':
    'Poskytovateľ nahrávania nie je nakonfigurovaný. Najprv zavolajte setProvider().',
  'uploads.error.streamLimitReached': 'Bol dosiahnutý limit streamu.',
  'uploads.error.aborted': 'Nahrávanie bolo prerušené.',
  'uploads.error.fileTypeBlocked': 'Súbory typu {{type}} nie je možné nahrať.',
  'uploads.error.activeTypeListed':
    'receiveUploads() uvádza {{type}}, typ, ktorý prehliadač spúšťa. Odovzdajte allowActiveTypes: true, aby sa uložil, a takéto súbory posielajte pomocou sendUpload().',
}
