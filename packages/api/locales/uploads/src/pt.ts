import type { UploadsTranslations } from './types.js'

/** Uploads translations for Portuguese. */
export const pt: UploadsTranslations = {
  'uploads.error.noProvider':
    'O provedor de upload não está configurado. Chame setProvider() primeiro.',
  'uploads.error.streamLimitReached': 'Limite do fluxo atingido.',
  'uploads.error.aborted': 'O upload foi cancelado.',
  'uploads.error.fileTypeBlocked': 'Não é possível enviar arquivos do tipo {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() inclui {{type}}, um tipo que o navegador executa. Passe allowActiveTypes: true para armazená-lo e sirva esses arquivos com sendUpload().',
}
