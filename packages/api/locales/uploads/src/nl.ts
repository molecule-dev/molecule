import type { UploadsTranslations } from './types.js'

/** Uploads translations for Dutch. */
export const nl: UploadsTranslations = {
  'uploads.error.noProvider':
    'Uploadprovider is niet geconfigureerd. Roep eerst setProvider() aan.',
  'uploads.error.streamLimitReached': 'Stroomlimiet bereikt.',
  'uploads.error.aborted': 'De upload is afgebroken.',
  'uploads.error.fileTypeBlocked': 'Bestanden van het type {{type}} kunnen niet worden geüpload.',
  'uploads.error.activeTypeListed':
    'receiveUploads() noemt {{type}}, een type dat een browser uitvoert. Geef allowActiveTypes: true mee om het op te slaan, en lever die bestanden met sendUpload().',
}
