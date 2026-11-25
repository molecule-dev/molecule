import type { PushTranslations } from './types.js'

/** Push translations for Sinhala. */
export const si: PushTranslations = {
  'push.error.notSupported': 'පුෂ් දැනුම්දීම් සහාය නොදක්වයි',
  'push.error.permissionNotGranted': 'දැනුම්දීම් අවසරය ලබා දී නැත',
  'push.error.missingDependency':
    '`{{library}}` අවශ්‍යයි නමුත් ස්ථාපනය කර නැත. `npx expo install {{library}}` සමඟ එය ස්ථාපනය කරන්න.',
  'push.error.noServiceWorker':
    'කිසිදු service worker එකක් ලියාපදිංචි කර නැත. Push දැනුම්දීම් සඳහා @molecule/app-pwa-default ස්ථාපනය කළ යෙදුමේ නිෂ්පාදන ගොඩනැගීම අවශ්‍ය වේ.',
}
