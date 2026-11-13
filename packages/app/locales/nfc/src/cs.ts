import type { NfcTranslations } from './types.js'

/** Nfc translations for Czech. */
export const cs: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `NfcProvider` — Molecule pro něj nedodává žádného poskytovatele; implementujte rozhraní ve svém nativním běhovém prostředí a propojte ho.',
}
