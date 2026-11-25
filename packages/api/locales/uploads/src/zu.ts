import type { UploadsTranslations } from './types.js'

/** Uploads translations for Zulu. */
export const zu: UploadsTranslations = {
  'uploads.error.noProvider':
    'Umhlinzeki wokulayisha awulungiselelwanga. Shayela setProvider() kuqala.',
  'uploads.error.streamLimitReached': 'Umkhawulo wesitrimu ufinyelelwe.',
  'uploads.error.aborted': 'Ukulayisha kukhanselwe.',
  'uploads.error.fileTypeBlocked': 'Amafayela ohlobo {{type}} awakwazi ukulayishwa.',
  'uploads.error.activeTypeListed':
    'I-receiveUploads() ibala u-{{type}}, uhlobo isiphequluli esiluqhubayo. Dlulisa u-allowActiveTypes: true ukuze ulugcine, futhi uhlinzeke lawo mafayela nge-sendUpload().',
}
