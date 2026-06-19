/** Translation keys for the property locale package. */
export type PropertyTranslationKey =
  | 'property.error.unauthorized'
  | 'property.error.forbidden'
  | 'property.error.nameRequired'
  | 'property.error.invalidName'
  | 'property.error.addressRequired'
  | 'property.error.createFailed'
  | 'property.error.notFound'
  | 'property.error.readFailed'
  | 'property.error.listFailed'
  | 'property.error.updateFailed'
  | 'property.error.deleteFailed'
  | 'property.error.listUnitsFailed'
  | 'property.error.unitNameRequired'
  | 'property.error.createUnitFailed'
  | 'property.error.listPhotosFailed'
  | 'property.error.photoUrlRequired'
  | 'property.error.createPhotoFailed'
  | 'property.error.listAmenitiesFailed'
  | 'property.error.amenityFieldsRequired'
  | 'property.error.amenityExists'
  | 'property.error.createAmenityFailed'

/** Translation record mapping property keys to translated strings. */
export type PropertyTranslations = Record<PropertyTranslationKey, string>
