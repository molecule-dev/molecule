import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for fil. */
export const fil: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Nakansela ang pag-upload',
  'fileUpload.error.extensionNotAccepted':
    'Hindi tinatanggap ang extension ng file na " {{extension}} "',
  'fileUpload.error.maxFiles': 'Naabot na ang pinakamataas na bilang ng mga file ({{maxFiles}})',
  'fileUpload.error.maxSize': 'Lumagpas ang file sa maximum na laki na {{maxSize}} bytes',
  'fileUpload.error.minSize': 'Ang file ay mas mababa sa minimum na laki na {{minSize}} bytes',
  'fileUpload.error.networkError': 'Nabigo ang pag-upload dahil sa error sa network',
  'fileUpload.error.noSource': 'Walang magagamit na pinagmulang file',
  'fileUpload.error.timedOut': 'Naubusan ng oras ang pag-upload',
  'fileUpload.error.typeNotAccepted': 'Hindi tinatanggap ang uri ng file na " {{type}} "',
  'fileUpload.error.uploadFailed': 'Nabigo ang pag-upload',
  'fileUpload.error.uploadFailedStatus': 'Nabigo ang pag-upload na may status na {{status}}',
}
