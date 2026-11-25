import type { UploadsTranslations } from './types.js'

/** Uploads translations for Hindi. */
export const hi: UploadsTranslations = {
  'uploads.error.noProvider': 'अपलोड प्रदाता कॉन्फ़िगर नहीं है। पहले setProvider() कॉल करें।',
  'uploads.error.streamLimitReached': 'स्ट्रीम सीमा पहुँच गई।',
  'uploads.error.aborted': 'अपलोड निरस्त कर दिया गया।',
  'uploads.error.fileTypeBlocked': '{{type}} प्रकार की फ़ाइलें अपलोड नहीं की जा सकतीं।',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} को सूचीबद्ध करता है, जो ऐसा प्रकार है जिसे ब्राउज़र चलाता है। इसे संग्रहीत करने के लिए allowActiveTypes: true दें, और उन फ़ाइलों को sendUpload() से परोसें।',
}
