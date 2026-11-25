import type { UploadsTranslations } from './types.js'

/** Uploads translations for Maltese. */
export const mt: UploadsTranslations = {
  'uploads.error.noProvider':
    'Il-fornitur tat-tlughhijiet mhux ikkonfigurat. Sejjah setProvider() l-ewwel.',
  'uploads.error.streamLimitReached': 'Il-limitu tal-istreaming intlahaq.',
  'uploads.error.aborted': 'It-tlugh ġie kkanċellat.',
  'uploads.error.fileTypeBlocked': 'Fajls tat-tip {{type}} ma jistgħux jittellgħu.',
  'uploads.error.activeTypeListed':
    "receiveUploads() jelenka {{type}}, tip li browser iħaddem. Għaddi allowActiveTypes: true biex taħżnu, u servi dawk il-fajls b'sendUpload().",
}
