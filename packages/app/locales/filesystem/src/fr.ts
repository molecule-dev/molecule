import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for French. */
export const fr: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem` : Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation `FilesystemProvider` — Molecule ne fournit aucun fournisseur pour ce système de fichiers ; implémentez l’interface dans votre environnement d’exécution natif et effectuez la liaison.',
}
