import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Kannada. */
export const kn: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: ಯಾವುದೇ ಒದಗಿಸುವವರನ್ನು ಹೊಂದಿಸಲಾಗಿಲ್ಲ. ClipboardProvider ಅನುಷ್ಠಾನದೊಂದಿಗೆ setProvider() ಅನ್ನು ಕರೆ ಮಾಡಿ (ಉದಾ., @molecule/app-clipboard-react-native ನಿಂದ).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ಒದಗಿಸುವವರಿಂದ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ',
  'clipboard.error.missingDependency':
    '`{{library}}` ಅಗತ್ಯವಿದೆ ಆದರೆ ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ. ಇದನ್ನು ಇದರೊಂದಿಗೆ ಸ್ಥಾಪಿಸಿ: `npm install {{library}}`',
}
