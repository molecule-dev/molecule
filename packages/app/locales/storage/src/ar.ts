import type { StorageTranslations } from './types.js'

/** Storage translations for Arabic. */
export const ar: StorageTranslations = {
  'storage.error.noProvider': 'لم يتم تكوين مزود التخزين. قم باستدعاء setProvider() أولاً.',
  'storage.error.quotaExceeded': 'تم تجاوز حصة التخزين عند تعيين المفتاح "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'لم يتم تثبيت `@react-native-async-storage/async-storage` . قم بتثبيته باستخدام الأمر التالي: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'فشل تعيين قيمة للمفتاح " {{key}} " في AsyncStorage',
}
