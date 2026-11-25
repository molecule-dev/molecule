import type { UploadsTranslations } from './types.js'

/** Uploads translations for Armenian. */
export const hy: UploadsTranslations = {
  'uploads.error.noProvider': 'Վերբեռնման մատակարարը կազմաձևված չէ։ Նախ կանչեք setProvider()։',
  'uploads.error.streamLimitReached': 'Հոսքի սահմանը հասել է։',
  'uploads.error.aborted': 'Վերբեռնումը չեղարկվել է։',
  'uploads.error.fileTypeBlocked': '{{type}} տեսակի ֆայլերը հնարավոր չէ վերբեռնել։',
  'uploads.error.activeTypeListed':
    'receiveUploads()-ը նշում է {{type}}, տեսակ, որը դիտարկիչը գործարկում է։ Այն պահելու համար փոխանցեք allowActiveTypes: true, և այդ ֆայլերը մատուցեք sendUpload()-ով։',
}
