import type { UploadsTranslations } from './types.js'

/** Uploads translations for Macedonian. */
export const mk: UploadsTranslations = {
  'uploads.error.noProvider':
    'Провајдерот за прикачување не е конфигуриран. Прво повикајте setProvider().',
  'uploads.error.streamLimitReached': 'Достигнат е лимитот на протокот.',
  'uploads.error.aborted': 'Прикачувањето беше прекинато.',
  'uploads.error.fileTypeBlocked': 'Датотеки од типот {{type}} не можат да се прикачат.',
  'uploads.error.activeTypeListed':
    'receiveUploads() го наведува {{type}}, тип што прелистувачот го извршува. Проследете allowActiveTypes: true за да го зачувате, и служете ги тие датотеки со sendUpload().',
}
