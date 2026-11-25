import type { UploadsTranslations } from './types.js'

/** Uploads translations for English. */
export const en: UploadsTranslations = {
  'uploads.error.noProvider': 'Upload provider not configured. Call setProvider() first.',
  'uploads.error.streamLimitReached': 'Stream limit reached.',
  'uploads.error.aborted': 'Upload was aborted.',
  'uploads.error.fileTypeBlocked': 'Files of type {{type}} cannot be uploaded.',
  'uploads.error.activeTypeListed':
    'receiveUploads() lists {{type}}, a type a browser runs. Pass allowActiveTypes: true to store it, and serve those files with sendUpload().',
}
