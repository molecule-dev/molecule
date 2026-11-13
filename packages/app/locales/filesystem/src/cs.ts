import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Czech. */
export const cs: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `FilesystemProvider` — Molecule pro něj nedodává žádného poskytovatele; implementujte rozhraní v nativním běhovém prostředí a propojte ho.',
}
