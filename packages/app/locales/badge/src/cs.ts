import type { BadgeTranslations } from './types.js'

/** Badge translations for Czech. */
export const cs: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `BadgeProvider` — Molecule pro něj nedodává žádného poskytovatele; implementujte rozhraní ve svém nativním běhovém prostředí a propojte ho.',
}
