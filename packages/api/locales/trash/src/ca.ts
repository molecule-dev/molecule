import type { TrashTranslations } from './types.js'

/** Trash translations for Catalan. */
export const ca: TrashTranslations = {
  'trash.error.alreadyResolved': "L'element eliminat ja s'ha restaurat o purgat",
  'trash.error.countFailed': "No s'han pogut comptar els elements eliminats",
  'trash.error.listFailed': "No s'han pogut llistar els elements eliminats",
  'trash.error.missingId': "Cal l'identificador de la paperera",
  'trash.error.missingResource': "Calen el tipus i l'identificador del recurs",
  'trash.error.notFound': 'Element eliminat no trobat',
  'trash.error.noRestoreHandler':
    'No hi ha cap gestor de restauració registrat per a aquest tipus de recurs',
  'trash.error.purgeFailed': "No s'ha pogut purgar l'element eliminat",
  'trash.error.readFailed': "No s'ha pogut llegir l'element eliminat",
  'trash.error.restoreFailed': "No s'ha pogut restaurar l'element eliminat",
  'trash.error.trashFailed': "No s'ha pogut moure l'element a la paperera",
  'trash.error.validationFailed': 'La validació ha fallat',
}
