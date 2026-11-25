import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Marathi. */
export const mr: BodyParserTranslations = {
  'middleware.error.badRequest': 'चुकीची विनंती.',
  'middleware.error.fileTooLarge': 'फाइल {{limit}} पेक्षा मोठी आहे.',
  'middleware.error.fileTypeNotAllowed':
    'या प्रकारच्या फाइलला परवानगी नाही. परवानगी असलेले प्रकार: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" फील्डमध्ये फाइल पाठवा.',
  'middleware.error.tooManyFiles': 'खूप जास्त फाइल्स. मर्यादा {{max}} आहे.',
  'middleware.error.unexpectedFile': 'फाइल "{{field}}" नव्हे, "{{expected}}" फील्डमध्ये पाठवा.',
  'middleware.error.notMultipart': 'फाइल multipart/form-data म्हणून "{{field}}" फील्डमध्ये पाठवा.',
  'middleware.error.payloadTooLarge': 'विनंती खूप मोठी आहे.',
}
