import type { StorageTranslations } from './types.js'

/** Storage translations for Gujarati. */
export const gu: StorageTranslations = {
  'storage.error.noProvider': 'સ્ટોરેજ પ્રોવાઇડર ગોઠવાયેલ નથી. પહેલા setProvider() કૉલ કરો.',
  'storage.error.quotaExceeded': '"{{key}}" કી સેટ કરતી વખતે સ્ટોરેજ ક્વોટા ઓળંગાઈ ગઈ',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ઇન્સ્ટોલ કરેલું નથી. તેને આ રીતે ઇન્સ્ટોલ કરો: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage માં " {{key}} " કી માટે મૂલ્ય સેટ કરવામાં નિષ્ફળ.',
}
