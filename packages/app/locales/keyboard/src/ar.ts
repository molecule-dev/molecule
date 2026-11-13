import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for Arabic. */
export const ar: KeyboardTranslations = {
  'keyboard.error.noProvider':
    '@molecule/app-keyboard: لم يتم تعيين مزود. قم باستدعاء setProvider() مع تنفيذ KeyboardProvider (مثلاً من @molecule/app-keyboard-react-native).',
  'keyboard.error.missingDependency': '`{{library}}` مطلوب ولكنه غير مثبت.',
}
