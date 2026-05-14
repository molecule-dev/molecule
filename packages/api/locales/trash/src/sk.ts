import type { TrashTranslations } from './types.js'

/** Trash translations for Slovak. */
export const sk: TrashTranslations = {
  'trash.error.alreadyResolved': 'Odstránená položka už bola obnovená alebo natrvalo odstránená',
  'trash.error.countFailed': 'Nepodarilo sa spočítať odstránené položky',
  'trash.error.listFailed': 'Nepodarilo sa vypísať odstránené položky',
  'trash.error.missingId': 'Vyžaduje sa ID koša',
  'trash.error.missingResource': 'Vyžaduje sa typ a ID zdroja',
  'trash.error.notFound': 'Odstránená položka sa nenašla',
  'trash.error.noRestoreHandler':
    'Pre tento typ zdroja nie je zaregistrovaný žiadny obslužný program obnovenia',
  'trash.error.purgeFailed': 'Nepodarilo sa natrvalo odstrániť odstránenú položku',
  'trash.error.readFailed': 'Nepodarilo sa prečítať odstránenú položku',
  'trash.error.restoreFailed': 'Nepodarilo sa obnoviť odstránenú položku',
  'trash.error.trashFailed': 'Nepodarilo sa presunúť položku do koša',
  'trash.error.validationFailed': 'Overenie zlyhalo',
}
