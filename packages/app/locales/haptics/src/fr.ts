import type { HapticsTranslations } from './types.js'

/** Haptics translations for French. */
export const fr: HapticsTranslations = {
  'haptics.error.noProvider':
    "`@molecule/app-haptics` : Aucun fournisseur n'est défini. Appelez `setProvider()` avec une implémentation `HapticsProvider` — Molecule ne fournit aucun fournisseur pour cette fonctionnalité ; implémentez l'interface dans votre environnement d'exécution natif et effectuez la liaison.",
}
