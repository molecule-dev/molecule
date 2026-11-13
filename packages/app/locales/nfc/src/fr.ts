import type { NfcTranslations } from './types.js'

/** Nfc translations for French. */
export const fr: NfcTranslations = {
  'nfc.error.noProvider':
    "`@molecule/app-nfc` : Aucun fournisseur n'est défini. Appelez `setProvider()` avec une implémentation de `NfcProvider` — Molecule ne fournit aucun fournisseur pour cela ; implémentez l'interface dans votre environnement d'exécution natif et associez-la.",
}
