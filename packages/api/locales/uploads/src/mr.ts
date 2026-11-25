import type { UploadsTranslations } from './types.js'

/** Uploads translations for Marathi. */
export const mr: UploadsTranslations = {
  'uploads.error.noProvider': 'अपलोड प्रदाता कॉन्फिगर केलेला नाही. आधी setProvider() कॉल करा.',
  'uploads.error.streamLimitReached': 'स्ट्रीम मर्यादा गाठली.',
  'uploads.error.aborted': 'अपलोड रद्द केले गेले.',
  'uploads.error.fileTypeBlocked': '{{type}} प्रकारच्या फाइल्स अपलोड करता येत नाहीत.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} सूचीबद्ध करते, जो ब्राउझर चालवतो असा प्रकार आहे. तो साठवण्यासाठी allowActiveTypes: true द्या, आणि त्या फाइल्स sendUpload() ने द्या.',
}
