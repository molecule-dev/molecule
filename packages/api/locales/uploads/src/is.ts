import type { UploadsTranslations } from './types.js'

/** Uploads translations for Icelandic. */
export const is: UploadsTranslations = {
  'uploads.error.noProvider': 'Upphaalsveita er ekki stillt. Kallaðu á setProvider() fyrst.',
  'uploads.error.streamLimitReached': 'Straumtakmörkum náð.',
  'uploads.error.aborted': 'Hætt var við upphleðsluna.',
  'uploads.error.fileTypeBlocked': 'Ekki er hægt að hlaða upp skrám af gerðinni {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() tilgreinir {{type}}, tegund sem vafri keyrir. Sendu allowActiveTypes: true til að vista hana og afhentu þær skrár með sendUpload().',
}
