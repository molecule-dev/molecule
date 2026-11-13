import type { AiTranslations } from './types.js'

/** Ai translations for Finnish. */
export const fi: AiTranslations = {
  'ai.error.noProvider':
    'AI-palveluntarjoajaa ei ole määritetty. Yhdistä ensin AI-palveluntarjoaja.',
  'ai.error.ambiguousProvider':
    'Useita nimettyjä AI-palveluntarjoajia on yhdistetty eikä oletusta ole asetettu. Käytä getProviderByName(name) valitaksesi yhden.',
  'ai.error.responseIncomplete': 'Tekoälyn vastaus päättyi ennen valmistumista. Yritä uudelleen.',
  'ai.error.responseTokenLimit':
    'Tekoälyn vastaus saavutti lähtötokenien rajan ennen valmistumista.',
  'ai.error.apiError': 'Tekoälypalveluvirhe. Yritä uudelleen.',
  'ai.error.noResponseBody': 'Ei vastausta tekoälypalvelulta.',
}
