import type { ConfigTranslations } from './types.js'

/** Config translations for Nepali. */
export const ne: ConfigTranslations = {
  'config.error.required': "आवश्यक कन्फिगरेसन '{{key}}' सेट गरिएको छैन।",
  'config.error.mustBeNumber': "कन्फिगरेसन '{{key}}' संख्या हुनुपर्छ।",
  'config.error.minValue': "कन्फिगरेसन '{{key}}' कम्तिमा {{min}} हुनुपर्छ।",
  'config.error.maxValue': "कन्फिगरेसन '{{key}}' बढीमा {{max}} हुनुपर्छ।",
  'config.error.mustBeBoolean': "कन्फिगरेसन '{{key}}' बुलियन हुनुपर्छ (true/false/1/0)।",
  'config.error.mustBeJson': "कन्फिगरेसन '{{key}}' मान्य JSON हुनुपर्छ।",
  'config.error.patternMismatch': "कन्फिगरेसन '{{key}}' ढाँचा '{{pattern}}' सँग मेल खाँदैन।",
  'config.error.invalidEnum': "कन्फिगरेसन '{{key}}' यी मध्ये एक हुनुपर्छ: {{values}}।",
  'config.error.validationNotSupported': 'हालको कन्फिगरेसन प्रदायकले प्रमाणीकरण समर्थन गर्दैन।',
}
