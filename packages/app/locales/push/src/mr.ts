import type { PushTranslations } from './types.js'

/** Push translations for Marathi. */
export const mr: PushTranslations = {
  'push.error.notSupported': 'पुश सूचना समर्थित नाहीत',
  'push.error.permissionNotGranted': 'सूचना परवानगी दिली नाही',
  'push.error.missingDependency':
    '`{{library}}` आवश्यक आहे, परंतु स्थापित केलेले नाही. ते या कमांडने स्थापित करा: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'कोणताही service worker नोंदणीकृत नाही. पुश सूचनांसाठी @molecule/app-pwa-default इंस्टॉल केलेले ॲपचे प्रोडक्शन बिल्ड आवश्यक आहे.',
}
