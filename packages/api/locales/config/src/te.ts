import type { ConfigTranslations } from './types.js'

/** Config translations for Telugu. */
export const te: ConfigTranslations = {
  'config.error.required': "అవసరమైన కాన్ఫిగరేషన్ '{{key}}' సెట్ చేయబడలేదు.",
  'config.error.mustBeNumber': "కాన్ఫిగరేషన్ '{{key}}' తప్పనిసరిగా సంఖ్య అయి ఉండాలి.",
  'config.error.minValue': "కాన్ఫిగరేషన్ '{{key}}' కనీసం {{min}} ఉండాలి.",
  'config.error.maxValue': "కాన్ఫిగరేషన్ '{{key}}' గరిష్టంగా {{max}} ఉండాలి.",
  'config.error.mustBeBoolean': "కాన్ఫిగరేషన్ '{{key}}' బూలియన్ అయి ఉండాలి (true/false/1/0).",
  'config.error.mustBeJson': "కాన్ఫిగరేషన్ '{{key}}' చెల్లుబాటు అయ్యే JSON అయి ఉండాలి.",
  'config.error.patternMismatch': "కాన్ఫిగరేషన్ '{{key}}' నమూనా '{{pattern}}' తో సరిపోలడం లేదు.",
  'config.error.invalidEnum': "కాన్ఫిగరేషన్ '{{key}}' వీటిలో ఒకటి అయి ఉండాలి: {{values}}.",
  'config.error.validationNotSupported':
    'ప్రస్తుత కాన్ఫిగరేషన్ ప్రొవైడర్ ధ్రువీకరణకు మద్దతు ఇవ్వదు.',
}
