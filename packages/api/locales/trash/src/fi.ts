import type { TrashTranslations } from './types.js'

/** Trash translations for Finnish. */
export const fi: TrashTranslations = {
  'trash.error.alreadyResolved':
    'Roskakoriin siirretty kohde on jo palautettu tai poistettu pysyvästi',
  'trash.error.countFailed': 'Roskakorin kohteiden laskeminen epäonnistui',
  'trash.error.listFailed': 'Roskakorin kohteiden listaaminen epäonnistui',
  'trash.error.missingId': 'Roskakorin tunnus vaaditaan',
  'trash.error.missingResource': 'Resurssin tyyppi ja tunnus vaaditaan',
  'trash.error.notFound': 'Roskakorin kohdetta ei löytynyt',
  'trash.error.noRestoreHandler': 'Tälle resurssityypille ei ole rekisteröity palautuskäsittelijää',
  'trash.error.purgeFailed': 'Roskakorin kohteen pysyvä poistaminen epäonnistui',
  'trash.error.readFailed': 'Roskakorin kohteen lukeminen epäonnistui',
  'trash.error.restoreFailed': 'Roskakorin kohteen palauttaminen epäonnistui',
  'trash.error.trashFailed': 'Kohteen siirtäminen roskakoriin epäonnistui',
  'trash.error.validationFailed': 'Vahvistus epäonnistui',
}
