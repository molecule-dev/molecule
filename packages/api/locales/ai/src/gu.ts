import type { AiTranslations } from './types.js'

/** Ai translations for Gujarati. */
export const gu: AiTranslations = {
  'ai.error.noProvider': 'AI પ્રદાતા ગોઠવાયેલ નથી. પહેલા AI પ્રદાતાને બોન્ડ કરો.',
  'ai.error.ambiguousProvider':
    'એકથી વધુ નામાંકિત AI પ્રદાતાઓ બોન્ડ કરેલા છે અને કોઈ ડિફોલ્ટ સેટ કરેલ નથી. એક પસંદ કરવા માટે getProviderByName(name) નો ઉપયોગ કરો.',
  'ai.error.responseIncomplete':
    'AI પ્રતિભાવ પૂર્ણ થાય તે પહેલાં જ સમાપ્ત થઈ ગયો. કૃપા કરીને ફરી પ્રયાસ કરો.',
  'ai.error.responseTokenLimit':
    'પૂર્ણ થાય તે પહેલાં AI પ્રતિભાવ આઉટપુટ ટોકન મર્યાદા સુધી પહોંચી ગયો.',
  'ai.error.apiError': 'AI સેવા ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.',
  'ai.error.noResponseBody': 'AI સેવા તરફથી કોઈ પ્રતિભાવ નથી.',
}
