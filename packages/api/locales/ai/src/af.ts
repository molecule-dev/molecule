import type { AiTranslations } from './types.js'

/** Ai translations for Afrikaans. */
export const af: AiTranslations = {
  'ai.error.noProvider': "KI-verskaffer is nie gekonfigureer nie. Bind eers 'n KI-verskaffer.",
  'ai.error.apiError': 'KI API-versoek het misluk.',
  'ai.error.noResponseBody': 'KI-antwoordliggaam is leeg.',
  'ai.error.ambiguousProvider':
    'Verskeie benoemde KI-verskaffers is gebind en geen verstek is gestel nie. Gebruik getProviderByName(name) om een te kies.',
}
