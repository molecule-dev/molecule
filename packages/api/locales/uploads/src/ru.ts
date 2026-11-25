import type { UploadsTranslations } from './types.js'

/** Uploads translations for Russian. */
export const ru: UploadsTranslations = {
  'uploads.error.noProvider': 'Провайдер загрузки не настроен. Сначала вызовите setProvider().',
  'uploads.error.streamLimitReached': 'Достигнут лимит потока.',
  'uploads.error.aborted': 'Загрузка была прервана.',
  'uploads.error.fileTypeBlocked': 'Файлы типа {{type}} нельзя загрузить.',
  'uploads.error.activeTypeListed':
    'receiveUploads() перечисляет {{type}} — тип, который браузер выполняет. Передайте allowActiveTypes: true, чтобы сохранять его, и отдавайте такие файлы через sendUpload().',
}
