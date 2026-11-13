import type { AiTranslations } from './types.js'

/** Ai translations for Filipino. */
export const fil: AiTranslations = {
  'ai.error.noProvider': 'Hindi naka-configure ang AI provider. Mag-bond muna ng AI provider.',
  'ai.error.ambiguousProvider':
    'Maraming pinangalanang AI provider ang naka-bond at walang default na naitakda. Gamitin ang getProviderByName(name) upang pumili ng isa.',
  'ai.error.responseIncomplete':
    'Natapos ang tugon ng AI bago pa man makumpleto. Pakisubukang muli.',
  'ai.error.responseTokenLimit':
    'Naabot na ng tugon ng AI ang limitasyon ng output token bago pa man makumpleto.',
  'ai.error.apiError': 'May error sa serbisyo ng AI. Pakisubukang muli.',
  'ai.error.noResponseBody': 'Walang tugon mula sa serbisyo ng AI.',
}
