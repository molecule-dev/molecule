import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Finnish. */
export const fi: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Versioiden laskeminen epäonnistui',
  'versionHistory.error.createFailed': 'Version luominen epäonnistui',
  'versionHistory.error.diffFailed': 'Versioiden vertailu epäonnistui',
  'versionHistory.error.diffNotFound':
    'Toista tai kumpaakaan versiota ei löytynyt, tai ne kuuluvat eri resursseihin',
  'versionHistory.error.invalidVersion': 'Versionumeron on oltava positiivinen kokonaisluku',
  'versionHistory.error.listFailed': 'Versioiden listaaminen epäonnistui',
  'versionHistory.error.missingId': 'Version tunnus vaaditaan',
  'versionHistory.error.missingResource': 'Resurssin tyyppi ja tunnus vaaditaan',
  'versionHistory.error.notFound': 'Versiota ei löytynyt',
  'versionHistory.error.readFailed': 'Version lukeminen epäonnistui',
  'versionHistory.error.restoreFailed': 'Version palauttaminen epäonnistui',
  'versionHistory.error.validationFailed': 'Vahvistus epäonnistui',
}
