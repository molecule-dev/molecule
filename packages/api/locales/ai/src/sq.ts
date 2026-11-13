import type { AiTranslations } from './types.js'

/** Ai translations for Albanian. */
export const sq: AiTranslations = {
  'ai.error.noProvider': 'Ofruesi i AI nuk është konfiguruar. Lidhni një ofrues AI fillimisht.',
  'ai.error.ambiguousProvider':
    'Disa ofrues AI të emërtuar janë lidhur dhe nuk është vendosur asnjë i parazgjedhur. Përdorni getProviderByName(name) për të zgjedhur njërin.',
  'ai.error.responseIncomplete':
    'Përgjigja e inteligjencës artificiale përfundoi para përfundimit. Ju lutemi provoni përsëri.',
  'ai.error.responseTokenLimit':
    'Përgjigja e IA-së arriti limitin e tokenit të daljes para përfundimit.',
  'ai.error.apiError': 'Gabim në shërbimin e inteligjencës artificiale. Ju lutemi provoni përsëri.',
  'ai.error.noResponseBody': 'Asnjë përgjigje nga shërbimi i IA-së.',
}
