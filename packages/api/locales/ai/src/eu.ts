import type { AiTranslations } from './types.js'

/** Ai translations for Basque. */
export const eu: AiTranslations = {
  'ai.error.noProvider': 'AA hornitzailea ez dago konfiguratuta. Lotu AA hornitzaile bat lehenik.',
  'ai.error.ambiguousProvider':
    'Izendatutako AA hornitzaile bat baino gehiago lotuta daude eta ez da lehenetsirik ezarri. Erabili getProviderByName(name) bat aukeratzeko.',
  'ai.error.responseIncomplete': 'IA erantzuna amaitu baino lehen amaitu da. Saiatu berriro.',
  'ai.error.responseTokenLimit':
    'AI erantzunak irteerako token mugara iritsi zen amaitu baino lehen.',
  'ai.error.apiError': 'AI zerbitzuaren errorea. Saiatu berriro.',
  'ai.error.noResponseBody': 'Ez dago erantzunik IA zerbitzutik.',
}
