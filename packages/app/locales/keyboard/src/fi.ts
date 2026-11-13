import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for Finnish. */
export const fi: KeyboardTranslations = {
  'keyboard.error.noProvider':
    '@molecule/app-keyboard: Palveluntarjoajaa ei ole asetettu. Kutsu setProvider() KeyboardProvider-toteutuksella (esim. @molecule/app-keyboard-react-native).',
  'keyboard.error.missingDependency': '`{{library}}` on pakollinen, mutta sitä ei ole asennettu.',
}
