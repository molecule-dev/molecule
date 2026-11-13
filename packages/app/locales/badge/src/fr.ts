import type { BadgeTranslations } from './types.js'

/** Badge translations for fr. */
export const fr: Partial<BadgeTranslations> = {
  'badge.error.noProvider':
    '`@molecule/app-badge` : Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation `BadgeProvider` — Molecule ne fournit aucun fournisseur pour cela ; implémentez l’interface dans votre environnement d’exécution natif et liez-la.',
}
