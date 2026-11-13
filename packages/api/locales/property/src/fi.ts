import type { PropertyTranslations } from './types.js'

/** Property translations for Finnish. */
export const fi: PropertyTranslations = {
  'property.error.unauthorized': 'Luvaton.',
  'property.error.forbidden': 'Sinulla ei ole pääsyä tähän kiinteistöön',
  'property.error.nameRequired': 'Kiinteistön nimi on pakollinen',
  'property.error.invalidName': 'Ominaisuuden nimi on virheellinen',
  'property.error.addressRequired': 'Osoiterivi 1, kaupunki ja maakoodi ovat pakollisia',
  'property.error.createFailed': 'Ominaisuuden luominen epäonnistui',
  'property.error.notFound': 'Kohdetta ei löytynyt',
  'property.error.readFailed': 'Ominaisuuden lukeminen epäonnistui',
  'property.error.listFailed': 'Ominaisuuksien listaaminen epäonnistui',
  'property.error.updateFailed': 'Ominaisuuden päivittäminen epäonnistui',
  'property.error.deleteFailed': 'Ominaisuuden poistaminen epäonnistui',
  'property.error.listUnitsFailed': 'Kiinteistöyksiköiden listaaminen epäonnistui',
  'property.error.unitNameRequired': 'Yksikön nimi on pakollinen',
  'property.error.createUnitFailed': 'Ominaisuusyksikön luominen epäonnistui',
  'property.error.listPhotosFailed': 'Kiinteistön kuvien listaaminen epäonnistui',
  'property.error.photoUrlRequired': 'Kuvan URL-osoite vaaditaan',
  'property.error.createPhotoFailed': 'Kohteen valokuvan luominen epäonnistui',
  'property.error.listAmenitiesFailed': 'Majoituspaikan mukavuuksien listaaminen epäonnistui',
  'property.error.amenityFieldsRequired': 'Palvelukoodi ja -tarra vaaditaan',
  'property.error.amenityExists':
    'Tällä koodilla varustettu mukavuus on jo olemassa tälle kiinteistölle.',
  'property.error.createAmenityFailed': 'Kohteen mukavuuden luominen epäonnistui',
}
