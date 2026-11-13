import type { ShareTranslations } from './types.js'

/** Share translations for fr. */
export const fr: Partial<ShareTranslations> = {
  'share.error.noProvider':
    '`@molecule/app-share` : Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation `ShareProvider` — Molecule ne fournit aucun fournisseur pour cette fonctionnalité ; implémentez l’interface dans votre environnement d’exécution natif et effectuez la liaison.',
}
