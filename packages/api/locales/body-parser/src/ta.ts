import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Tamil. */
export const ta: BodyParserTranslations = {
  'middleware.error.badRequest': 'தவறான கோரிக்கை.',
  'middleware.error.fileTooLarge': 'கோப்பு {{limit}}-ஐ விடப் பெரியது.',
  'middleware.error.fileTypeNotAllowed':
    'இந்தக் கோப்பு வகை அனுமதிக்கப்படவில்லை. அனுமதிக்கப்பட்ட வகைகள்: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" புலத்தில் ஒரு கோப்பை அனுப்பவும்.',
  'middleware.error.tooManyFiles': 'அதிகமான கோப்புகள். வரம்பு {{max}}.',
  'middleware.error.unexpectedFile':
    'கோப்பை "{{field}}" அல்ல, "{{expected}}" புலத்தில் அனுப்பவும்.',
  'middleware.error.notMultipart':
    'கோப்பை multipart/form-data ஆக "{{field}}" புலத்தில் அனுப்பவும்.',
  'middleware.error.payloadTooLarge': 'கோரிக்கை மிகப் பெரியது.',
}
