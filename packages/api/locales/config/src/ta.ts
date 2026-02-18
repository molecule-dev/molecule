import type { ConfigTranslations } from './types.js'

/** Config translations for Tamil. */
export const ta: ConfigTranslations = {
  'config.error.required': "தேவையான உள்ளமைவு '{{key}}' அமைக்கப்படவில்லை.",
  'config.error.mustBeNumber': "உள்ளமைவு '{{key}}' எண்ணாக இருக்க வேண்டும்.",
  'config.error.minValue': "உள்ளமைவு '{{key}}' குறைந்தது {{min}} ஆக இருக்க வேண்டும்.",
  'config.error.maxValue': "உள்ளமைவு '{{key}}' அதிகபட்சம் {{max}} ஆக இருக்க வேண்டும்.",
  'config.error.mustBeBoolean': "உள்ளமைவு '{{key}}' பூலியன் ஆக இருக்க வேண்டும் (true/false/1/0).",
  'config.error.mustBeJson': "உள்ளமைவு '{{key}}' சரியான JSON ஆக இருக்க வேண்டும்.",
  'config.error.patternMismatch': "உள்ளமைவு '{{key}}' மாதிரி '{{pattern}}' உடன் பொருந்தவில்லை.",
  'config.error.invalidEnum': "உள்ளமைவு '{{key}}' இவற்றில் ஒன்றாக இருக்க வேண்டும்: {{values}}.",
  'config.error.validationNotSupported': 'தற்போதைய உள்ளமைவு வழங்குநர் சரிபார்ப்பை ஆதரிக்கவில்லை.',
}
