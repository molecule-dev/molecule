import type { NfcTranslations } from './types.js'

/** Nfc translations for it. */
export const it: Partial<NfcTranslations> = {
  'nfc.error.noProvider':
    "`@molecule/app-nfc`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `NfcProvider` : Molecule non fornisce alcun provider per questo; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
