import type { ConfigTranslations } from './types.js'

/** Config translations for Kannada. */
export const kn: ConfigTranslations = {
  'config.error.required': "ಅಗತ್ಯವಿರುವ ಸಂರಚನೆ '{{key}}' ಹೊಂದಿಸಲಾಗಿಲ್ಲ.",
  'config.error.mustBeNumber': "ಸಂರಚನೆ '{{key}}' ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.",
  'config.error.minValue': "ಸಂರಚನೆ '{{key}}' ಕನಿಷ್ಠ {{min}} ಆಗಿರಬೇಕು.",
  'config.error.maxValue': "ಸಂರಚನೆ '{{key}}' ಹೆಚ್ಚೆಂದರೆ {{max}} ಆಗಿರಬೇಕು.",
  'config.error.mustBeBoolean': "ಸಂರಚನೆ '{{key}}' ಬೂಲಿಯನ್ ಆಗಿರಬೇಕು (true/false/1/0).",
  'config.error.mustBeJson': "ಸಂರಚನೆ '{{key}}' ಮಾನ್ಯವಾದ JSON ಆಗಿರಬೇಕು.",
  'config.error.patternMismatch': "ಸಂರಚನೆ '{{key}}' ಮಾದರಿ '{{pattern}}' ಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.",
  'config.error.invalidEnum': "ಸಂರಚನೆ '{{key}}' ಈ ಒಂದರಾಗಿರಬೇಕು: {{values}}.",
  'config.error.validationNotSupported':
    'ಪ್ರಸ್ತುತ ಸಂರಚನೆ ಪೂರೈಕೆದಾರರು ಮೌಲ್ಯೀಕರಣವನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.',
}
