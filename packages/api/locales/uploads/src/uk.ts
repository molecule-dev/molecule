import type { UploadsTranslations } from './types.js'

/** Uploads translations for Ukrainian. */
export const uk: UploadsTranslations = {
  'uploads.error.noProvider':
    'Провайдер завантаження не налаштований. Спочатку викличте setProvider().',
  'uploads.error.streamLimitReached': 'Досягнуто ліміт потоку.',
  'uploads.error.aborted': 'Завантаження було скасовано.',
  'uploads.error.fileTypeBlocked': 'Файли типу {{type}} не можна завантажити.',
  'uploads.error.activeTypeListed':
    'receiveUploads() перелічує {{type}} — тип, який браузер виконує. Передайте allowActiveTypes: true, щоб зберігати його, і віддавайте такі файли через sendUpload().',
}
