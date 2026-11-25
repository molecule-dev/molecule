import type { UploadsTranslations } from './types.js'

/** Uploads translations for Amharic. */
export const am: UploadsTranslations = {
  'uploads.error.noProvider': 'የስቀላ አቅራቢ አልተዋቀረም። መጀመሪያ setProvider() ይደውሉ።',
  'uploads.error.streamLimitReached': 'የዥረት ገደብ ደርሷል።',
  'uploads.error.aborted': 'ስቀላው ተቋርጧል።',
  'uploads.error.fileTypeBlocked': 'የ{{type}} አይነት ፋይሎችን መስቀል አይቻልም።',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}}ን ይዘረዝራል፣ ይህም አሳሽ የሚያስኬደው አይነት ነው። ለማስቀመጥ allowActiveTypes: true ይስጡ፣ እነዚያን ፋይሎች በsendUpload() ያቅርቡ።',
}
