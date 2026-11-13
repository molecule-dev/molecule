import type { StorageTranslations } from './types.js'

/** Storage translations for Kannada. */
export const kn: StorageTranslations = {
  'storage.error.noProvider': 'ಸ್ಟೋರೇಜ್ ಪ್ರೊವೈಡರ್ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ. ಮೊದಲು setProvider() ಕರೆ ಮಾಡಿ.',
  'storage.error.quotaExceeded': '"{{key}}" ಕೀಲಿಯನ್ನು ಹೊಂದಿಸುವಾಗ ಸ್ಟೋರೇಜ್ ಕೋಟಾ ಮೀರಿದೆ',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ. ಇದನ್ನು ಇದರೊಂದಿಗೆ ಸ್ಥಾಪಿಸಿ: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage ನಲ್ಲಿ " {{key}} " ಕೀಲಿಗೆ ಮೌಲ್ಯವನ್ನು ಹೊಂದಿಸಲು ವಿಫಲವಾಗಿದೆ.',
}
