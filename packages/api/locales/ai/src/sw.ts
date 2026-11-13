import type { AiTranslations } from './types.js'

/** Ai translations for Swahili. */
export const sw: AiTranslations = {
  'ai.error.noProvider': 'Mtoa huduma wa AI hajasanidiwa. Unganisha mtoa huduma wa AI kwanza.',
  'ai.error.ambiguousProvider':
    'Watoa huduma wengi wa AI wenye majina wameunganishwa na hakuna chaguo-msingi lililowekwa. Tumia getProviderByName(name) kuchagua mmoja.',
  'ai.error.responseIncomplete': 'Jibu la AI liliisha kabla ya kukamilika. Tafadhali jaribu tena.',
  'ai.error.responseTokenLimit':
    'Jibu la AI lilifikia kikomo cha tokeni ya matokeo kabla ya kukamilika.',
  'ai.error.apiError': 'Hitilafu ya huduma ya akili bandia. Tafadhali jaribu tena.',
  'ai.error.noResponseBody': 'Hakuna jibu kutoka kwa huduma ya AI.',
}
