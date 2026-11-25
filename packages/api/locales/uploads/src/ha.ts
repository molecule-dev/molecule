import type { UploadsTranslations } from './types.js'

/** Uploads translations for Hausa. */
export const ha: UploadsTranslations = {
  'uploads.error.noProvider': 'Ba a saita mai ba da lodawa ba. Fara da kiran setProvider().',
  'uploads.error.streamLimitReached': 'An kai iyakar rafi.',
  'uploads.error.aborted': 'An dakatar da lodawa.',
  'uploads.error.fileTypeBlocked': 'Ba za a iya loda fayilolin nau’in {{type}} ba.',
  'uploads.error.activeTypeListed':
    "receiveUploads() ya lissafa {{type}}, nau'in da mai bincike ke gudanarwa. Ba da allowActiveTypes: true don adana shi, kuma ka ba da waɗannan fayiloli da sendUpload().",
}
