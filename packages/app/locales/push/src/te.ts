import type { PushTranslations } from './types.js'

/** Push translations for Telugu. */
export const te: PushTranslations = {
  'push.error.notSupported': 'పుష్ నోటిఫికేషన్‌లు మద్దతు లేదు',
  'push.error.permissionNotGranted': 'నోటిఫికేషన్ అనుమతి ఇవ్వబడలేదు',
  'push.error.missingDependency':
    '`{{library}}` అవసరం, కానీ అది ఇన్‌స్టాల్ చేయబడలేదు. దీనిని ఈ కమాండ్‌తో ఇన్‌స్టాల్ చేయండి: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'ఏ service worker నమోదు కాలేదు. పుష్ నోటిఫికేషన్‌లకు @molecule/app-pwa-default ఇన్‌స్టాల్ చేసిన యాప్ ప్రొడక్షన్ బిల్డ్ అవసరం.',
}
