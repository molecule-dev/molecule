import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for it. */
export const it: Partial<BluetoothTranslations> = {
  'bluetooth.error.noProvider':
    "`@molecule/app-bluetooth`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione `BluetoothProvider` : Molecule non fornisce alcun provider per questo; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
