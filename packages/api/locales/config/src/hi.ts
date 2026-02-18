import type { ConfigTranslations } from './types.js'

/** Config translations for Hindi. */
export const hi: ConfigTranslations = {
  'config.error.required': "आवश्यक कॉन्फ़िगरेशन '{{key}}' सेट नहीं है।",
  'config.error.mustBeNumber': "कॉन्फ़िगरेशन '{{key}}' एक संख्या होनी चाहिए।",
  'config.error.minValue': "कॉन्फ़िगरेशन '{{key}}' कम से कम {{min}} होनी चाहिए।",
  'config.error.maxValue': "कॉन्फ़िगरेशन '{{key}}' अधिकतम {{max}} होनी चाहिए।",
  'config.error.mustBeBoolean': "कॉन्फ़िगरेशन '{{key}}' बूलियन होनी चाहिए (true/false/1/0)।",
  'config.error.mustBeJson': "कॉन्फ़िगरेशन '{{key}}' मान्य JSON होनी चाहिए।",
  'config.error.patternMismatch': "कॉन्फ़िगरेशन '{{key}}' पैटर्न '{{pattern}}' से मेल नहीं खाती।",
  'config.error.invalidEnum': "कॉन्फ़िगरेशन '{{key}}' इनमें से एक होनी चाहिए: {{values}}।",
  'config.error.validationNotSupported':
    'वर्तमान कॉन्फ़िगरेशन प्रदाता सत्यापन का समर्थन नहीं करता।',
}
