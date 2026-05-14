import type { TrashTranslations } from './types.js'

/** Trash translations for Italian. */
export const it: TrashTranslations = {
  'trash.error.alreadyResolved':
    "L'elemento eliminato è già stato ripristinato o eliminato definitivamente",
  'trash.error.countFailed': 'Impossibile contare gli elementi eliminati',
  'trash.error.listFailed': 'Impossibile elencare gli elementi eliminati',
  'trash.error.missingId': "L'ID del cestino è obbligatorio",
  'trash.error.missingResource': "Il tipo e l'ID della risorsa sono obbligatori",
  'trash.error.notFound': 'Elemento eliminato non trovato',
  'trash.error.noRestoreHandler':
    'Nessun gestore di ripristino registrato per questo tipo di risorsa',
  'trash.error.purgeFailed': "Impossibile eliminare definitivamente l'elemento eliminato",
  'trash.error.readFailed': "Impossibile leggere l'elemento eliminato",
  'trash.error.restoreFailed': "Impossibile ripristinare l'elemento eliminato",
  'trash.error.trashFailed': "Impossibile spostare l'elemento nel cestino",
  'trash.error.validationFailed': 'Convalida non riuscita',
}
