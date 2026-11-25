import type { UploadsTranslations } from './types.js'

/** Uploads translations for Filipino. */
export const fil: UploadsTranslations = {
  'uploads.error.noProvider':
    'Hindi naka-configure ang upload provider. Tumawag muna ng setProvider().',
  'uploads.error.streamLimitReached': 'Naabot na ang limitasyon ng stream.',
  'uploads.error.aborted': 'Na-abort ang pag-upload.',
  'uploads.error.fileTypeBlocked': 'Hindi maaaring i-upload ang mga file na may uri na {{type}}.',
  'uploads.error.activeTypeListed':
    'Inililista ng receiveUploads() ang {{type}}, isang uri na pinapatakbo ng browser. Ipasa ang allowActiveTypes: true para iimbak ito, at ihain ang mga file na iyon gamit ang sendUpload().',
}
