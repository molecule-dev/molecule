import type { UploadsTranslations } from './types.js'

/** Uploads translations for Nepali. */
export const ne: UploadsTranslations = {
  'uploads.error.noProvider': 'अपलोड प्रदायक कन्फिगर गरिएको छैन। पहिले setProvider() कल गर्नुहोस्।',
  'uploads.error.streamLimitReached': 'स्ट्रिम सीमा पुग्यो।',
  'uploads.error.aborted': 'अपलोड रद्द गरियो।',
  'uploads.error.fileTypeBlocked': '{{type}} प्रकारका फाइलहरू अपलोड गर्न सकिँदैन।',
  'uploads.error.activeTypeListed':
    'receiveUploads() ले {{type}} सूचीबद्ध गर्छ, जुन ब्राउजरले चलाउने प्रकार हो। यसलाई भण्डार गर्न allowActiveTypes: true दिनुहोस्, र ती फाइलहरू sendUpload() बाट दिनुहोस्।',
}
