import type { HapticsTranslations } from './types.js'

/** Haptics translations for Czech. */
export const cs: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `HapticsProvider` — Molecule pro něj nedodává žádného poskytovatele; implementujte rozhraní ve svém nativním běhovém prostředí a propojte ho.',
}
