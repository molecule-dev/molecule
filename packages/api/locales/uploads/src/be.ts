import type { UploadsTranslations } from './types.js'

/** Uploads translations for Belarusian. */
export const be: UploadsTranslations = {
  'uploads.error.noProvider': 'Правайдар загрузкі не наладжаны. Спачатку выклічце setProvider().',
  'uploads.error.streamLimitReached': 'Дасягнуты ліміт патоку.',
  'uploads.error.aborted': 'Загрузка была скасавана.',
  'uploads.error.fileTypeBlocked': 'Файлы тыпу {{type}} нельга загрузіць.',
  'uploads.error.activeTypeListed':
    'receiveUploads() пералічвае {{type}} — тып, які браўзер выконвае. Перадайце allowActiveTypes: true, каб захоўваць яго, і аддавайце такія файлы праз sendUpload().',
}
