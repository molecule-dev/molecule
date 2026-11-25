import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Punjabi. */
export const pa: BodyParserTranslations = {
  'middleware.error.badRequest': 'ਖ਼ਰਾਬ ਬੇਨਤੀ।',
  'middleware.error.fileTooLarge': 'ਫ਼ਾਈਲ {{limit}} ਤੋਂ ਵੱਡੀ ਹੈ।',
  'middleware.error.fileTypeNotAllowed':
    'ਇਸ ਕਿਸਮ ਦੀ ਫ਼ਾਈਲ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਹੈ। ਇਜਾਜ਼ਤ ਵਾਲੀਆਂ ਕਿਸਮਾਂ: {{types}}।',
  'middleware.error.fileMissing': '"{{field}}" ਖੇਤਰ ਵਿੱਚ ਇੱਕ ਫ਼ਾਈਲ ਭੇਜੋ।',
  'middleware.error.tooManyFiles': 'ਬਹੁਤ ਸਾਰੀਆਂ ਫ਼ਾਈਲਾਂ। ਸੀਮਾ {{max}} ਹੈ।',
  'middleware.error.unexpectedFile': 'ਫ਼ਾਈਲ "{{field}}" ਨਹੀਂ, "{{expected}}" ਖੇਤਰ ਵਿੱਚ ਭੇਜੋ।',
  'middleware.error.notMultipart': 'ਫ਼ਾਈਲ ਨੂੰ multipart/form-data ਵਜੋਂ "{{field}}" ਖੇਤਰ ਵਿੱਚ ਭੇਜੋ।',
  'middleware.error.payloadTooLarge': 'ਬੇਨਤੀ ਬਹੁਤ ਵੱਡੀ ਹੈ।',
}
