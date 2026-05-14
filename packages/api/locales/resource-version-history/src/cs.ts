import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Czech. */
export const cs: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Nepodařilo se spočítat verze',
  'versionHistory.error.createFailed': 'Nepodařilo se vytvořit verzi',
  'versionHistory.error.diffFailed': 'Nepodařilo se porovnat verze',
  'versionHistory.error.diffNotFound':
    'Jedna nebo obě verze nebyly nalezeny nebo patří k různým prostředkům',
  'versionHistory.error.invalidVersion': 'Číslo verze musí být kladné celé číslo',
  'versionHistory.error.listFailed': 'Nepodařilo se vypsat verze',
  'versionHistory.error.missingId': 'Je vyžadováno ID verze',
  'versionHistory.error.missingResource': 'Je vyžadován typ a ID prostředku',
  'versionHistory.error.notFound': 'Verze nebyla nalezena',
  'versionHistory.error.readFailed': 'Nepodařilo se přečíst verzi',
  'versionHistory.error.restoreFailed': 'Nepodařilo se obnovit verzi',
  'versionHistory.error.validationFailed': 'Ověření selhalo',
}
