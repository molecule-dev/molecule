import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for French. */
export const fr: BluetoothTranslations = {
  'bluetooth.error.noProvider':
    "`@molecule/app-bluetooth` : Aucun fournisseur n'est défini. Appelez `setProvider()` avec une implémentation de `BluetoothProvider` — Molecule ne fournit aucun fournisseur pour cette interface ; implémentez-la dans votre environnement d'exécution natif et effectuez la liaison.",
}
