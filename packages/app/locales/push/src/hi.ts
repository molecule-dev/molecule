import type { PushTranslations } from './types.js'

/** Push translations for Hindi. */
export const hi: PushTranslations = {
  'push.error.notSupported': 'पुश सूचनाएँ समर्थित नहीं हैं',
  'push.error.permissionNotGranted': 'सूचना अनुमति नहीं दी गई',
  'push.error.missingDependency':
    '`{{library}}` आवश्यक है लेकिन स्थापित नहीं है। इसे निम्न कमांड से स्थापित करें: `npx expo install {{library}}`',
}
