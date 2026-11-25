import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Filipino. */
export const fil: BodyParserTranslations = {
  'middleware.error.badRequest': 'Hindi valid na request.',
  'middleware.error.fileTooLarge': 'Mas malaki ang file kaysa sa {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Hindi pinapayagan ang uri ng file na ito. Mga pinapayagang uri: {{types}}.',
  'middleware.error.fileMissing': 'Magpadala ng file sa field na "{{field}}".',
  'middleware.error.tooManyFiles': 'Masyadong maraming file. Ang limitasyon ay {{max}}.',
  'middleware.error.unexpectedFile':
    'Ipadala ang file sa field na "{{expected}}", hindi sa "{{field}}".',
  'middleware.error.notMultipart':
    'Ipadala ang file bilang multipart/form-data sa field na "{{field}}".',
  'middleware.error.payloadTooLarge': 'Masyadong malaki ang kahilingan.',
}
