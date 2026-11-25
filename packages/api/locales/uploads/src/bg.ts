import type { UploadsTranslations } from './types.js'

/** Uploads translations for Bulgarian. */
export const bg: UploadsTranslations = {
  'uploads.error.noProvider':
    'Доставчикът за качване не е конфигуриран. Първо извикайте setProvider().',
  'uploads.error.streamLimitReached': 'Лимитът на потока е достигнат.',
  'uploads.error.aborted': 'Качването беше прекратено.',
  'uploads.error.fileTypeBlocked': 'Файлове от тип {{type}} не могат да бъдат качвани.',
  'uploads.error.activeTypeListed':
    'receiveUploads() изброява {{type}} — тип, който браузърът изпълнява. Подайте allowActiveTypes: true, за да го съхраните, и сервирайте тези файлове със sendUpload().',
}
