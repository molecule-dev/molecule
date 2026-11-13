import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Nepali. */
export const ne: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: कुनै प्रदायक सेट गरिएको छैन। ClipboardProvider कार्यान्वयनसँग setProvider() कल गर्नुहोस् (जस्तै, @molecule/app-clipboard-react-native बाट)।',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange प्रदायक द्वारा समर्थित छैन',
  'clipboard.error.missingDependency':
    '`{{library}}` आवश्यक छ तर स्थापना गरिएको छैन। यसलाई `npm install {{library}}` सँग स्थापना गर्नुहोस्।',
}
