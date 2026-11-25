import type { PushTranslations } from './types.js'

/** Push translations for Kannada. */
export const kn: PushTranslations = {
  'push.error.notSupported': 'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು ಬೆಂಬಲಿತವಲ್ಲ',
  'push.error.permissionNotGranted': 'ಅಧಿಸೂಚನೆ ಅನುಮತಿ ನೀಡಲಾಗಿಲ್ಲ',
  'push.error.missingDependency':
    '`{{library}}` ಅಗತ್ಯವಿದೆ ಆದರೆ ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ. ಇದನ್ನು ಇದರೊಂದಿಗೆ ಸ್ಥಾಪಿಸಿ: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'ಯಾವುದೇ service worker ನೋಂದಾಯಿಸಲಾಗಿಲ್ಲ. ಪುಶ್ ಅಧಿಸೂಚನೆಗಳಿಗೆ @molecule/app-pwa-default ಸ್ಥಾಪಿಸಿದ ಆ್ಯಪ್‌ನ ಪ್ರೊಡಕ್ಷನ್ ಬಿಲ್ಡ್ ಅಗತ್ಯವಿದೆ.',
}
