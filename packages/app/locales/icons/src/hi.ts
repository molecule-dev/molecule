import type { IconsTranslations } from './types.js'

/** Icons translations for Hindi. */
export const hi: IconsTranslations = {
  'icons.error.noIconSet':
    'कोई IconSet सेट नहीं किया गया है। ऐप स्टार्टअप पर एक आइकन लाइब्रेरी के साथ setIconSet() कॉल करें (जैसे, @molecule/app-icons-molecule)।',
  'icons.error.noProvider':
    '@molecule/app-icons: कोई आइकन सेट जुड़ा नहीं है। किसी IconSet के साथ setIconSet() कॉल करें (जैसे, @molecule/app-icons-molecule से एक्सपोर्ट)।',
  'icons.error.notFound': 'आइकन "{{name}}" वर्तमान आइकन सेट में नहीं मिला।',
}
