import type { PushTranslations } from './types.js'

/** Push translations for Nepali. */
export const ne: PushTranslations = {
  'push.error.notSupported': 'पुश सूचनाहरू समर्थित छैनन्',
  'push.error.permissionNotGranted': 'सूचना अनुमति दिइएको छैन',
  'push.error.missingDependency':
    '`{{library}}` आवश्यक छ तर स्थापना गरिएको छैन। यसलाई निम्नसँग स्थापना गर्नुहोस्: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'कुनै service worker दर्ता गरिएको छैन। पुश सूचनाहरूका लागि @molecule/app-pwa-default स्थापना गरिएको एपको प्रोडक्सन बिल्ड चाहिन्छ।',
}
