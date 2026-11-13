import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for Bulgarian. */
export const bg: KeyboardTranslations = {
  'keyboard.error.noProvider':
    '@molecule/app-keyboard: Не е зададен доставчик. Извикайте setProvider() с имплементация на KeyboardProvider (напр. от @molecule/app-keyboard-react-native).',
  'keyboard.error.missingDependency': '`{{library}}` е задължителна, но не е инсталирана.',
}
