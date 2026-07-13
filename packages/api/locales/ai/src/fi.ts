import type { AiTranslations } from './types.js'

/** Ai translations for Finnish. */
export const fi: AiTranslations = {
  'ai.error.noProvider':
    'AI-palveluntarjoajaa ei ole määritetty. Yhdistä ensin AI-palveluntarjoaja.',
  'ai.error.apiError': 'AI API -pyyntö epäonnistui.',
  'ai.error.noResponseBody': 'AI-vastauksen runko on tyhjä.',
  'ai.error.ambiguousProvider':
    'Useita nimettyjä AI-palveluntarjoajia on yhdistetty eikä oletusta ole asetettu. Käytä getProviderByName(name) valitaksesi yhden.',
}
