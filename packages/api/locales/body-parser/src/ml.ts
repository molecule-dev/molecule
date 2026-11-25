import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Malayalam. */
export const ml: BodyParserTranslations = {
  'middleware.error.badRequest': 'മോശം അഭ്യർത്ഥന.',
  'middleware.error.fileTooLarge': 'ഫയൽ {{limit}}-ൽ കൂടുതലാണ്.',
  'middleware.error.fileTypeNotAllowed': 'ഈ ഫയൽ തരം അനുവദനീയമല്ല. അനുവദനീയമായ തരങ്ങൾ: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" ഫീൽഡിൽ ഒരു ഫയൽ അയയ്ക്കുക.',
  'middleware.error.tooManyFiles': 'ഫയലുകൾ വളരെ കൂടുതലാണ്. പരിധി {{max}} ആണ്.',
  'middleware.error.unexpectedFile': 'ഫയൽ "{{field}}" അല്ല, "{{expected}}" ഫീൽഡിൽ അയയ്ക്കുക.',
  'middleware.error.notMultipart': 'ഫയൽ multipart/form-data ആയി "{{field}}" ഫീൽഡിൽ അയയ്ക്കുക.',
  'middleware.error.payloadTooLarge': 'അഭ്യർത്ഥന വളരെ വലുതാണ്.',
}
