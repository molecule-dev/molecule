import type { UploadsTranslations } from './types.js'

/** Uploads translations for Serbian. */
export const sr: UploadsTranslations = {
  'uploads.error.noProvider': 'Провајдер отпремања није конфигурисан. Прво позовите setProvider().',
  'uploads.error.streamLimitReached': 'Достигнут је лимит тока.',
  'uploads.error.aborted': 'Отпремање је прекинуто.',
  'uploads.error.fileTypeBlocked': 'Датотеке типа {{type}} не могу да се отпреме.',
  'uploads.error.activeTypeListed':
    'receiveUploads() наводи {{type}}, тип који прегледач извршава. Проследите allowActiveTypes: true да бисте га сачували и послужујте те датотеке помоћу sendUpload().',
}
