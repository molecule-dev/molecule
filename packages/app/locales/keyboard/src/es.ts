import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for Spanish. */
export const es: KeyboardTranslations = {
  'keyboard.error.noProvider':
    '@molecule/app-keyboard: No se ha establecido un proveedor. Llame a setProvider() con una implementación de KeyboardProvider (p. ej., de @molecule/app-keyboard-react-native).',
  'keyboard.error.missingDependency': '`{{library}}` es necesaria pero no está instalada.',
}
