import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for English. */
export const en: BluetoothTranslations = {
  'bluetooth.error.noProvider':
    '`@molecule/app-bluetooth`: No provider set. Call `setProvider()` with a `BluetoothProvider` implementation — Molecule ships no provider for it; implement the interface on your native runtime and bond it.',
}
