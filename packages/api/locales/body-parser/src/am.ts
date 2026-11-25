import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Amharic. */
export const am: BodyParserTranslations = {
  'middleware.error.badRequest': 'ልክ ያልሆነ ጥያቄ።',
  'middleware.error.fileTooLarge': 'ፋይሉ ከ{{limit}} ይበልጣል።',
  'middleware.error.fileTypeNotAllowed': 'ይህ የፋይል አይነት አይፈቀድም። የተፈቀዱ አይነቶች፦ {{types}}።',
  'middleware.error.fileMissing': 'በ"{{field}}" መስክ ውስጥ ፋይል ይላኩ።',
  'middleware.error.tooManyFiles': 'በጣም ብዙ ፋይሎች። ገደቡ {{max}} ነው።',
  'middleware.error.unexpectedFile': 'ፋይሉን በ"{{field}}" ሳይሆን በ"{{expected}}" መስክ ይላኩ።',
  'middleware.error.notMultipart': 'ፋይሉን እንደ multipart/form-data በ"{{field}}" መስክ ይላኩ።',
  'middleware.error.payloadTooLarge': 'ጥያቄው በጣም ትልቅ ነው።',
}
