import type { ScreenOrientationTranslations } from './types.js'

/** ScreenOrientation translations for it. */
export const it: Partial<ScreenOrientationTranslations> = {
  'screenOrientation.error.noProvider':
    "`@molecule/app-screen-orientation`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `ScreenOrientationProvider` : Molecule non fornisce alcun provider per questo; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
