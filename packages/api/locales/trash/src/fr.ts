import type { TrashTranslations } from './types.js'

/** Trash translations for French. */
export const fr: TrashTranslations = {
  'trash.error.alreadyResolved': "L'élément supprimé a déjà été restauré ou purgé",
  'trash.error.countFailed': 'Échec du comptage des éléments supprimés',
  'trash.error.listFailed': 'Échec de la liste des éléments supprimés',
  'trash.error.missingId': "L'identifiant de la corbeille est requis",
  'trash.error.missingResource': "Le type et l'identifiant de la ressource sont requis",
  'trash.error.notFound': 'Élément supprimé introuvable',
  'trash.error.noRestoreHandler':
    "Aucun gestionnaire de restauration n'est enregistré pour ce type de ressource",
  'trash.error.purgeFailed': "Échec de la purge de l'élément supprimé",
  'trash.error.readFailed': "Échec de la lecture de l'élément supprimé",
  'trash.error.restoreFailed': "Échec de la restauration de l'élément supprimé",
  'trash.error.trashFailed': "Échec du déplacement de l'élément vers la corbeille",
  'trash.error.validationFailed': 'La validation a échoué',
}
