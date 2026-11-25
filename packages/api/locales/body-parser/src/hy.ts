import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Armenian. */
export const hy: BodyParserTranslations = {
  'middleware.error.badRequest': 'Skhalmunk harc.',
  'middleware.error.fileTooLarge': 'Ֆայլը մեծ է {{limit}}-ից։',
  'middleware.error.fileTypeNotAllowed':
    'Այս ֆայլի տեսակը թույլատրված չէ։ Թույլատրված տեսակներ՝ {{types}}։',
  'middleware.error.fileMissing': 'Ուղարկեք ֆայլ "{{field}}" դաշտում։',
  'middleware.error.tooManyFiles': 'Չափազանց շատ ֆայլեր։ Սահմանաչափը {{max}} է։',
  'middleware.error.unexpectedFile': 'Ուղարկեք ֆայլը "{{expected}}" դաշտում, ոչ թե "{{field}}"։',
  'middleware.error.notMultipart': 'Ուղարկեք ֆայլը որպես multipart/form-data "{{field}}" դաշտում։',
  'middleware.error.payloadTooLarge': 'Հարցումը չափազանց մեծ է։',
}
