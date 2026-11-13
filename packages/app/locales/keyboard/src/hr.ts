import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for Croatian. */
export const hr: KeyboardTranslations = {
  'keyboard.error.noProvider':
    '@molecule/app-keyboard: Pružatelj nije postavljen. Pozovite setProvider() s implementacijom KeyboardProvider (npr. iz @molecule/app-keyboard-react-native).',
  'keyboard.error.missingDependency': '`{{library}}` je obavezna, ali nije instalirana.',
}
