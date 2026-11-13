import type { PropertyTranslations } from './types.js'

/** Property translations for Swedish. */
export const sv: PropertyTranslations = {
  'property.error.unauthorized': 'Obehörig.',
  'property.error.forbidden': 'Du har inte tillgång till den här fastigheten',
  'property.error.nameRequired': 'Fastighetsnamn krävs',
  'property.error.invalidName': 'Fastighetsnamnet är ogiltigt',
  'property.error.addressRequired': 'Adressrad 1, ort och landskod krävs',
  'property.error.createFailed': 'Misslyckades med att skapa egendomen',
  'property.error.notFound': 'Fastigheten hittades inte',
  'property.error.readFailed': 'Kunde inte läsa egenskapen',
  'property.error.listFailed': 'Misslyckades med att lista fastigheter',
  'property.error.updateFailed': 'Misslyckades med att uppdatera egenskapen',
  'property.error.deleteFailed': 'Misslyckades med att ta bort egendomen',
  'property.error.listUnitsFailed': 'Kunde inte lista fastighetsenheter',
  'property.error.unitNameRequired': 'Enhetsnamn krävs',
  'property.error.createUnitFailed': 'Misslyckades med att skapa fastighetsenhet',
  'property.error.listPhotosFailed': 'Misslyckades med att lista bilder på fastigheten',
  'property.error.photoUrlRequired': 'Foto-URL krävs',
  'property.error.createPhotoFailed': 'Misslyckades med att skapa ett foto på fastigheten',
  'property.error.listAmenitiesFailed': 'Kunde inte lista fastighetens bekvämligheter',
  'property.error.amenityFieldsRequired': 'Bekvämlighetskod och etikett krävs',
  'property.error.amenityExists': 'Faciliteter med denna kod finns redan för den här fastigheten',
  'property.error.createAmenityFailed': 'Misslyckades med att skapa bekvämligheter för fastigheten',
}
