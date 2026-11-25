import type { PushTranslations } from './types.js'

/** Push translations for Tamil. */
export const ta: PushTranslations = {
  'push.error.notSupported': 'புஷ் அறிவிப்புகள் ஆதரிக்கப்படவில்லை',
  'push.error.permissionNotGranted': 'அறிவிப்பு அனுமதி வழங்கப்படவில்லை',
  'push.error.missingDependency':
    '`{{library}}` தேவைப்படுகிறது, ஆனால் நிறுவப்படவில்லை. இதை நிறுவ: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'எந்த service worker-உம் பதிவு செய்யப்படவில்லை. புஷ் அறிவிப்புகளுக்கு @molecule/app-pwa-default நிறுவப்பட்ட பயன்பாட்டின் தயாரிப்பு பில்ட் தேவை.',
}
