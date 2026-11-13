import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for Norwegian Bokmål. */
export const nb: BluetoothTranslations = {
  'bluetooth.error.noProvider':
    '`@molecule/app-bluetooth`: Ingen leverandør angitt. Kall `setProvider()` med en `BluetoothProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den til.',
}
