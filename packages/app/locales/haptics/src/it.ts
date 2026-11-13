import type { HapticsTranslations } from './types.js'

/** Haptics translations for it. */
export const it: Partial<HapticsTranslations> = {
  'haptics.error.noProvider':
    "`@molecule/app-haptics`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `HapticsProvider` : Molecule non fornisce alcun provider per questo; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
