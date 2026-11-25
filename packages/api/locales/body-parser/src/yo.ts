import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Yoruba. */
export const yo: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ibeere ti ko dara.',
  'middleware.error.fileTooLarge': 'Fáìlì náà tóbi ju {{limit}} lọ.',
  'middleware.error.fileTypeNotAllowed':
    'A kò gba irú fáìlì yìí láàyè. Àwọn irú tí a gbà láàyè: {{types}}.',
  'middleware.error.fileMissing': 'Fi fáìlì ránṣẹ́ nínú pápá "{{field}}".',
  'middleware.error.tooManyFiles': 'Fáìlì ti pọ̀ jù. Ààlà rẹ̀ jẹ́ {{max}}.',
  'middleware.error.unexpectedFile':
    'Fi fáìlì náà ránṣẹ́ nínú pápá "{{expected}}", kì í ṣe "{{field}}".',
  'middleware.error.notMultipart':
    'Fi fáìlì náà ránṣẹ́ gẹ́gẹ́ bí multipart/form-data nínú pápá "{{field}}".',
  'middleware.error.payloadTooLarge': 'Ìbéèrè náà tóbi jù.',
}
