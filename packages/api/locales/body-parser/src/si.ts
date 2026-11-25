import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Sinhala. */
export const si: BodyParserTranslations = {
  'middleware.error.badRequest': 'නරක ඉල්ලීමක්.',
  'middleware.error.fileTooLarge': 'ගොනුව {{limit}} ට වඩා විශාලයි.',
  'middleware.error.fileTypeNotAllowed': 'මෙම ගොනු වර්ගයට අවසර නැත. අවසර ලත් වර්ග: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" ක්ෂේත්‍රයේ ගොනුවක් යවන්න.',
  'middleware.error.tooManyFiles': 'ගොනු ඕනෑවට වඩා වැඩියි. සීමාව {{max}} කි.',
  'middleware.error.unexpectedFile': 'ගොනුව "{{field}}" නොව "{{expected}}" ක්ෂේත්‍රයේ යවන්න.',
  'middleware.error.notMultipart': 'ගොනුව multipart/form-data ලෙස "{{field}}" ක්ෂේත්‍රයේ යවන්න.',
  'middleware.error.payloadTooLarge': 'ඉල්ලීම ඕනෑවට වඩා විශාලයි.',
}
