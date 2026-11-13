import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for it. */
export const it: Partial<KeyboardTranslations> = {
  'keyboard.error.noProvider':
    "@molecule/app-keyboard: Nessun provider impostato. Chiama setProvider() con un'implementazione di KeyboardProvider (ad esempio, da @molecule/app-keyboard-react-native).",
  'keyboard.error.missingDependency': '`{{library}}` è richiesto ma non installato.',
}
