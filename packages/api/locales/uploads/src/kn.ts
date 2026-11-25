import type { UploadsTranslations } from './types.js'

/** Uploads translations for Kannada. */
export const kn: UploadsTranslations = {
  'uploads.error.noProvider':
    'ಅಪ್‌ಲೋಡ್ ಪೂರೈಕೆದಾರ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ. ಮೊದಲು setProvider() ಅನ್ನು ಕರೆ ಮಾಡಿ.',
  'uploads.error.streamLimitReached': 'ಸ್ಟ್ರೀಮ್ ಮಿತಿ ತಲುಪಿದೆ.',
  'uploads.error.aborted': 'ಅಪ್‌ಲೋಡ್ ಅನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.',
  'uploads.error.fileTypeBlocked': '{{type}} ಪ್ರಕಾರದ ಫೈಲ್‌ಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} ಅನ್ನು ಪಟ್ಟಿ ಮಾಡುತ್ತದೆ, ಇದು ಬ್ರೌಸರ್ ಚಲಾಯಿಸುವ ಪ್ರಕಾರ. ಅದನ್ನು ಉಳಿಸಲು allowActiveTypes: true ನೀಡಿ, ಮತ್ತು ಆ ಫೈಲ್‌ಗಳನ್ನು sendUpload() ಮೂಲಕ ಒದಗಿಸಿ.',
}
