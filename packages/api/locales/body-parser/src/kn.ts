import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Kannada. */
export const kn: BodyParserTranslations = {
  'middleware.error.badRequest': 'ಕೆಟ್ಟ ವಿನಂತಿ.',
  'middleware.error.fileTooLarge': 'ಫೈಲ್ {{limit}} ಗಿಂತ ದೊಡ್ಡದಾಗಿದೆ.',
  'middleware.error.fileTypeNotAllowed':
    'ಈ ಫೈಲ್ ಪ್ರಕಾರಕ್ಕೆ ಅನುಮತಿ ಇಲ್ಲ. ಅನುಮತಿಸಲಾದ ಪ್ರಕಾರಗಳು: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" ಕ್ಷೇತ್ರದಲ್ಲಿ ಫೈಲ್ ಕಳುಹಿಸಿ.',
  'middleware.error.tooManyFiles': 'ತುಂಬಾ ಹೆಚ್ಚು ಫೈಲ್‌ಗಳು. ಮಿತಿ {{max}}.',
  'middleware.error.unexpectedFile':
    'ಫೈಲ್ ಅನ್ನು "{{field}}" ಅಲ್ಲ, "{{expected}}" ಕ್ಷೇತ್ರದಲ್ಲಿ ಕಳುಹಿಸಿ.',
  'middleware.error.notMultipart':
    'ಫೈಲ್ ಅನ್ನು multipart/form-data ಆಗಿ "{{field}}" ಕ್ಷೇತ್ರದಲ್ಲಿ ಕಳುಹಿಸಿ.',
  'middleware.error.payloadTooLarge': 'ವಿನಂತಿ ತುಂಬಾ ದೊಡ್ಡದಾಗಿದೆ.',
}
