import type { AiTranslations } from './types.js'

/** Ai translations for Amharic. */
export const am: AiTranslations = {
  'ai.error.noProvider': 'የ AI አቅራቢ አልተዋቀረም። መጀመሪያ የ AI አቅራቢ ያገናኙ።',
  'ai.error.ambiguousProvider':
    'ብዙ የተሰየሙ የ AI አቅራቢዎች ተያይዘዋል እና ነባሪ አልተዋቀረም። አንዱን ለመምረጥ getProviderByName(name)ን ይጠቀሙ።',
  'ai.error.responseIncomplete': 'የAI ምላሽ ከመጠናቀቁ በፊት አብቅቷል። እባክዎ እንደገና ይሞክሩ።',
  'ai.error.responseTokenLimit': 'የAI ምላሽ ከመጠናቀቁ በፊት የውጤት ቶከን ገደብ ላይ ደርሷል።',
  'ai.error.apiError': 'የAI አገልግሎት ስህተት። እባክዎ እንደገና ይሞክሩ።',
  'ai.error.noResponseBody': 'ከ AI አገልግሎት ምንም ምላሽ የለም።',
}
