import type { UploadsTranslations } from './types.js'

/** Uploads translations for Welsh. */
export const cy: UploadsTranslations = {
  'uploads.error.noProvider':
    "Nid yw darparwr llwytho i fyny wedi'i ffurfweddu. Galwch setProvider() yn gyntaf.",
  'uploads.error.streamLimitReached': 'Cyrhaeddwyd terfyn y ffrwd.',
  'uploads.error.aborted': 'Cafodd y llwytho i fyny ei ddiddymu.',
  'uploads.error.fileTypeBlocked': "Ni ellir llwytho ffeiliau o'r math {{type}} i fyny.",
  'uploads.error.activeTypeListed':
    "Mae receiveUploads() yn rhestru {{type}}, math y mae porwr yn ei redeg. Pasiwch allowActiveTypes: true i'w gadw, a gweinwch y ffeiliau hynny gyda sendUpload().",
}
