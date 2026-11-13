import type { PropertyTranslations } from './types.js'

/** Property translations for Ukrainian. */
export const uk: PropertyTranslations = {
  'property.error.unauthorized': 'Не авторизовано.',
  'property.error.forbidden': 'У вас немає доступу до цієї власності',
  'property.error.nameRequired': "Назва власності обов'язкова",
  'property.error.invalidName': 'Назва властивості недійсна',
  'property.error.addressRequired': 'Обов’язково вкажіть рядок 1 адреси, місто та код країни',
  'property.error.createFailed': 'Не вдалося створити ресурс',
  'property.error.notFound': 'Властивість не знайдена',
  'property.error.readFailed': 'Не вдалося прочитати властивість',
  'property.error.listFailed': 'Не вдалося переглянути список властивостей',
  'property.error.updateFailed': 'Не вдалося оновити ресурс',
  'property.error.deleteFailed': 'Не вдалося видалити ресурс',
  'property.error.listUnitsFailed': 'Не вдалося перерахувати одиниці нерухомості',
  'property.error.unitNameRequired': "Назва підрозділу обов'язкова",
  'property.error.createUnitFailed': 'Не вдалося створити одиницю власності',
  'property.error.listPhotosFailed': "Не вдалося додати фотографії об'єкта нерухомості",
  'property.error.photoUrlRequired': "URL-адреса фотографії обов'язкова",
  'property.error.createPhotoFailed': 'Не вдалося створити фотографію власності',
  'property.error.listAmenitiesFailed': 'Не вдалося перерахувати зручності помешкання',
  'property.error.amenityFieldsRequired': 'Потрібно вказати код зручності та етикетку',
  'property.error.amenityExists': 'Зручність із цим кодом вже існує для цієї власності',
  'property.error.createAmenityFailed': 'Не вдалося створити зручність на території готелю',
}
