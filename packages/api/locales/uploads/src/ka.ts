import type { UploadsTranslations } from './types.js'

/** Uploads translations for Georgian. */
export const ka: UploadsTranslations = {
  'uploads.error.noProvider':
    'ატვირთვის პროვაიდერი არ არის კონფიგურირებული. ჯერ გამოიძახეთ setProvider().',
  'uploads.error.streamLimitReached': 'ნაკადის ლიმიტი მიღწეულია.',
  'uploads.error.aborted': 'ატვირთვა შეწყდა.',
  'uploads.error.fileTypeBlocked': '{{type}} ტიპის ფაილების ატვირთვა შეუძლებელია.',
  'uploads.error.activeTypeListed':
    'receiveUploads() ჩამოთვლის {{type}}-ს, ტიპს, რომელსაც ბრაუზერი უშვებს. მის შესანახად გადაეცით allowActiveTypes: true და ეს ფაილები მიაწოდეთ sendUpload()-ით.',
}
