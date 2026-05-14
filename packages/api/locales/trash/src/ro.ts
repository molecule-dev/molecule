import type { TrashTranslations } from './types.js'

/** Trash translations for Romanian. */
export const ro: TrashTranslations = {
  'trash.error.alreadyResolved': 'Elementul șters a fost deja restaurat sau eliminat definitiv',
  'trash.error.countFailed': 'Nu s-au putut număra elementele șterse',
  'trash.error.listFailed': 'Nu s-au putut lista elementele șterse',
  'trash.error.missingId': 'Este necesar ID-ul coșului de gunoi',
  'trash.error.missingResource': 'Sunt necesare tipul și ID-ul resursei',
  'trash.error.notFound': 'Elementul șters nu a fost găsit',
  'trash.error.noRestoreHandler':
    'Nu există niciun handler de restaurare înregistrat pentru acest tip de resursă',
  'trash.error.purgeFailed': 'Nu s-a putut elimina definitiv elementul șters',
  'trash.error.readFailed': 'Nu s-a putut citi elementul șters',
  'trash.error.restoreFailed': 'Nu s-a putut restaura elementul șters',
  'trash.error.trashFailed': 'Nu s-a putut muta elementul în coșul de gunoi',
  'trash.error.validationFailed': 'Validarea a eșuat',
}
