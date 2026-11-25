import type { UploadsTranslations } from './types.js'

/** Uploads translations for Gujarati. */
export const gu: UploadsTranslations = {
  'uploads.error.noProvider': 'અપલોડ પ્રોવાઈડર ગોઠવાયેલ નથી. પહેલા setProvider() કૉલ કરો.',
  'uploads.error.streamLimitReached': 'સ્ટ્રીમ મર્યાદા પહોંચી ગઈ.',
  'uploads.error.aborted': 'અપલોડ રદ કરવામાં આવ્યું.',
  'uploads.error.fileTypeBlocked': '{{type}} પ્રકારની ફાઇલો અપલોડ કરી શકાતી નથી.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} સૂચિબદ્ધ કરે છે, જે બ્રાઉઝર ચલાવે છે એવો પ્રકાર છે. તેને સાચવવા allowActiveTypes: true આપો, અને તે ફાઇલો sendUpload() વડે પીરસો.',
}
