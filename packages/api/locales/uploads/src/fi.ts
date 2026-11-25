import type { UploadsTranslations } from './types.js'

/** Uploads translations for Finnish. */
export const fi: UploadsTranslations = {
  'uploads.error.noProvider':
    'Latauspalveluntarjoajaa ei ole määritetty. Kutsu ensin setProvider().',
  'uploads.error.streamLimitReached': 'Virran raja saavutettu.',
  'uploads.error.aborted': 'Lataus keskeytettiin.',
  'uploads.error.fileTypeBlocked': 'Tyypin {{type}} tiedostoja ei voi ladata palvelimelle.',
  'uploads.error.activeTypeListed':
    'receiveUploads() luettelee tyypin {{type}}, jonka selain suorittaa. Välitä allowActiveTypes: true tallentaaksesi sen, ja tarjoile nämä tiedostot funktiolla sendUpload().',
}
