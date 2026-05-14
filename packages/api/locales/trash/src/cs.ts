import type { TrashTranslations } from './types.js'

/** Trash translations for Czech. */
export const cs: TrashTranslations = {
  'trash.error.alreadyResolved': 'Smazaná položka již byla obnovena nebo trvale odstraněna',
  'trash.error.countFailed': 'Nepodařilo se spočítat smazané položky',
  'trash.error.listFailed': 'Nepodařilo se vypsat smazané položky',
  'trash.error.missingId': 'Je vyžadováno ID koše',
  'trash.error.missingResource': 'Je vyžadován typ a ID prostředku',
  'trash.error.notFound': 'Smazaná položka nebyla nalezena',
  'trash.error.noRestoreHandler':
    'Pro tento typ prostředku není zaregistrován žádný obslužný program obnovení',
  'trash.error.purgeFailed': 'Nepodařilo se trvale odstranit smazanou položku',
  'trash.error.readFailed': 'Nepodařilo se přečíst smazanou položku',
  'trash.error.restoreFailed': 'Nepodařilo se obnovit smazanou položku',
  'trash.error.trashFailed': 'Nepodařilo se přesunout položku do koše',
  'trash.error.validationFailed': 'Ověření selhalo',
}
