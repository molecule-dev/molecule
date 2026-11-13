import type { PropertyTranslations } from './types.js'

/** Property translations for Hungarian. */
export const hu: PropertyTranslations = {
  'property.error.unauthorized': 'Jogosulatlan.',
  'property.error.forbidden': 'Nincs hozzáférése ehhez az ingatlanhoz',
  'property.error.nameRequired': 'A tulajdonság nevének megadása kötelező',
  'property.error.invalidName': 'A tulajdonság neve érvénytelen',
  'property.error.addressRequired':
    'A cím 1. sorának, a városnak és az országkódnak a kitöltése kötelező.',
  'property.error.createFailed': 'Nem sikerült létrehozni a tulajdonságot',
  'property.error.notFound': 'Az ingatlan nem található',
  'property.error.readFailed': 'Nem sikerült beolvasni a tulajdonságot',
  'property.error.listFailed': 'Nem sikerült listázni a tulajdonságokat',
  'property.error.updateFailed': 'Nem sikerült frissíteni a tulajdonságot',
  'property.error.deleteFailed': 'Nem sikerült törölni a tulajdont',
  'property.error.listUnitsFailed': 'Nem sikerült listázni az ingatlanegységeket',
  'property.error.unitNameRequired': 'Az egység nevének megadása kötelező',
  'property.error.createUnitFailed': 'Nem sikerült létrehozni a tulajdonegységet',
  'property.error.listPhotosFailed': 'Nem sikerült listázni az ingatlan fotóit',
  'property.error.photoUrlRequired': 'A fotó URL-címe kötelező',
  'property.error.createPhotoFailed': 'Nem sikerült létrehozni az ingatlan fotóját',
  'property.error.listAmenitiesFailed': 'Nem sikerült felsorolni a szálláshely szolgáltatásait',
  'property.error.amenityFieldsRequired': 'Szolgáltatási kód és címke megadása kötelező',
  'property.error.amenityExists':
    'Már létezik ehhez a kódhoz tartozó szolgáltatás ehhez az ingatlanhoz.',
  'property.error.createAmenityFailed': 'Nem sikerült létrehozni az ingatlan szolgáltatásait',
}
