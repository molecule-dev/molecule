import type { StorageTranslations } from './types.js'

/** Storage translations for Korean. */
export const ko: StorageTranslations = {
  'storage.error.noProvider':
    '스토리지 제공자가 구성되지 않았습니다. 먼저 setProvider()를 호출하세요.',
  'storage.error.quotaExceeded': '"{{key}}" 키를 설정할 때 스토리지 할당량을 초과했습니다',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` 설치되어 있지 않습니다. 다음 명령으로 설치하세요: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage에서 키 " {{key}} "에 값을 설정하는 데 실패했습니다.',
}
