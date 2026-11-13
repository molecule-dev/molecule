import type { AiTranslations } from './types.js'

/** Ai translations for Afrikaans. */
export const af: AiTranslations = {
  'ai.error.noProvider': "KI-verskaffer is nie gekonfigureer nie. Bind eers 'n KI-verskaffer.",
  'ai.error.ambiguousProvider':
    'Verskeie benoemde KI-verskaffers is gebind en geen verstek is gestel nie. Gebruik getProviderByName(name) om een te kies.',
  'ai.error.responseIncomplete': 'KI-reaksie het voor voltooiing geëindig. Probeer asseblief weer.',
  'ai.error.responseTokenLimit': 'KI-reaksie het die uitvoertokenlimiet voor voltooiing bereik.',
  'ai.error.apiError': 'KI-diensfout. Probeer asseblief weer.',
  'ai.error.noResponseBody': 'Geen reaksie van KI-diens nie.',
}
