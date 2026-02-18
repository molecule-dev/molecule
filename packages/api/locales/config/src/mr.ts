import type { ConfigTranslations } from './types.js'

/** Config translations for Marathi. */
export const mr: ConfigTranslations = {
  'config.error.required': "आवश्यक कॉन्फिगरेशन '{{key}}' सेट केलेले नाही.",
  'config.error.mustBeNumber': "कॉन्फिगरेशन '{{key}}' संख्या असणे आवश्यक आहे.",
  'config.error.minValue': "कॉन्फिगरेशन '{{key}}' किमान {{min}} असणे आवश्यक आहे.",
  'config.error.maxValue': "कॉन्फिगरेशन '{{key}}' कमाल {{max}} असणे आवश्यक आहे.",
  'config.error.mustBeBoolean': "कॉन्फिगरेशन '{{key}}' बुलियन असणे आवश्यक आहे (true/false/1/0).",
  'config.error.mustBeJson': "कॉन्फिगरेशन '{{key}}' वैध JSON असणे आवश्यक आहे.",
  'config.error.patternMismatch': "कॉन्फिगरेशन '{{key}}' पॅटर्न '{{pattern}}' शी जुळत नाही.",
  'config.error.invalidEnum': "कॉन्फिगरेशन '{{key}}' यापैकी एक असणे आवश्यक आहे: {{values}}.",
  'config.error.validationNotSupported':
    'वर्तमान कॉन्फिगरेशन प्रदाता प्रमाणीकरणास समर्थन देत नाही.',
}
