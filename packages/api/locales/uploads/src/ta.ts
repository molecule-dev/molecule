import type { UploadsTranslations } from './types.js'

/** Uploads translations for Tamil. */
export const ta: UploadsTranslations = {
  'uploads.error.noProvider':
    'பதிவேற்ற வழங்குநர் கட்டமைக்கப்படவில்லை. முதலில் setProvider() ஐ அழைக்கவும்.',
  'uploads.error.streamLimitReached': 'ஸ்ட்ரீம் வரம்பை எட்டியது.',
  'uploads.error.aborted': 'பதிவேற்றம் ரத்து செய்யப்பட்டது.',
  'uploads.error.fileTypeBlocked': '{{type}} வகை கோப்புகளைப் பதிவேற்ற முடியாது.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} வகையைப் பட்டியலிடுகிறது, இது உலாவி இயக்கும் வகை. அதைச் சேமிக்க allowActiveTypes: true கொடுக்கவும், அந்தக் கோப்புகளை sendUpload() மூலம் வழங்கவும்.',
}
