import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for Danish. */
export const da: BluetoothTranslations = {
  'bluetooth.error.noProvider':
    '`@molecule/app-bluetooth`: Ingen udbyder angivet. Kald `setProvider()` med en `BluetoothProvider` implementering — Molecule sender ingen udbyder til den; implementer grænsefladen på din native runtime og tilknyt den.',
}
