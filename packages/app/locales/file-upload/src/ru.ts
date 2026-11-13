import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for ru. */
export const ru: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Загрузка отменена',
  'fileUpload.error.extensionNotAccepted': 'Расширение файла " {{extension}} " не принимается.',
  'fileUpload.error.maxFiles': 'Достигнуто максимальное количество файлов ({{maxFiles}}).',
  'fileUpload.error.maxSize':
    'Размер файла превышает максимально допустимый размер в {{maxSize}} байт.',
  'fileUpload.error.minSize': 'Размер файла меньше минимального значения {{minSize}} байт',
  'fileUpload.error.networkError': 'Загрузка не удалась из-за сетевой ошибки.',
  'fileUpload.error.noSource': 'Исходный файл недоступен',
  'fileUpload.error.timedOut': 'Время загрузки истекло.',
  'fileUpload.error.typeNotAccepted': 'Тип файла " {{type}} " не принимается.',
  'fileUpload.error.uploadFailed': 'Загрузка не удалась.',
  'fileUpload.error.uploadFailedStatus': 'Загрузка не удалась со статусом {{status}}',
}
